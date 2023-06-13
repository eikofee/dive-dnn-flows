import tensorflow as tf
import numpy as np
from pyspark import SparkContext
from pyspark.sql import SparkSession

##############
from lrpBib import funcBP
##############

epsilon = 1e-9

def initializeSparkContext():
    """
        Initializa Spark context (sc)
    """

    spark = SparkSession.builder.getOrCreate()
    sc = spark.sparkContext
    return sc

def getActivations(kerasModel, evaluationDataset):
    """
        Get activations by running prediction with all layers set at
        outputs.
    """

    layerOutputs = [layer.output for layer in kerasModel.layers[1:]]
    fullOutputModel = tf.keras.models.Model(
            inputs=kerasModel.inputs,
            outputs=layerOutputs)
    activations = fullOutputModel.predict(evaluationDataset)
    return activations

def computeActivations(sc, kerasModel, evaluationDataset, batchSize = 100):
    """
        Compute activations per batch on the cluster to avoid shuffling
    """

    layerOutputs = [layer.output for layer in kerasModel.layers[1:]]
    fullOutputModel = tf.keras.models.Model(
            inputs=kerasModel.inputs,
            outputs=layerOutputs)
    broadcastedModel = sc.broadcast(fullOutputModel)
    broadcastedDataset = sc.broadcast(evaluationDataset)
    datasetSize = len(evaluationDataset)
    batchCount = datasetSize / batchSize
    rdd = sc.range(batchCount)
    rdd = rdd.map(lambda x : (x, list(range(x * batchSize, (x + 1) * batchSize))))
    rdd = rdd.map(lambda x : (x[0], broadcastedModel.value.predict(broadcastedDataset.value[x[1]])))
    # rdd = [(batchIndex, [layerActivations])]
    return rdd

class LayerNode:
    Id = -1
    name = ""
    parents = list()
    children = list()
    typeId = ""
    infos = {}
    outputLayer = False
    inputLayer = False
    weights = []
    inputShape = (None)
    outputShape = (None)

    def __init__(self, nodeId):
        self.Id = nodeId

    def addParent(self, parentNode):
        self.parents.append(parentNode)

    def addChild(self, childNode):
        self.children.append(childNode)

    def setTypeId(self, typeString):
        self.typeId = typeString

    def getParents(self):
        return self.parents

    def getChildren(self):
        return self.children

    def getId(self):
        return self.Id

    def setWeights(self, w):
        self.weights = w

    def getWeights(self):
        return self.weights

    def setInfos(self, dic):
        self.infos = dic

    def getInfos(self):
        return self.infos

    def setName(self, nameString):
        self.name = nameString

    def getName(self):
        return self.name

    def setOutputLayer(self, state):
        self.outputLayer = state

    def isOutputLayer(self):
        return self.outputLayer

    def setInputLayer(self, state):
        self.inputLayer = state

    def isInputLayer(self):
        return self.inputLayer

    def setInputShape(self, shape):
        self.inputShape = shape

    def getInputShape(self):
        return self.inputShape

    def setOutputShape(self, shape):
        self.outputShape = shape

    def getOutputShape(self):
        return self.outputShape

def buildModelInfoGraph(kerasModel):
    """
        Build a graph representing the model architecture.
        Root node, which is returned, is linked to each
        InputLayer of the model.
    """

    root = LayerNode(-1)
    output = LayerNode(-2)
    currentId = -1
    nodes = {}
    layerConfigs = model.get_config()['layers']
    outputLayers = model.get_config()['output_layers']
    outputLayerNames = [x[0] for x in outputLayers]
    outputNodes = list()
    inputNodes = list()
    for config in layerConfigs:
        currentId += 1
        node = LayerNode(currentId)
        layerName = config['name']
        layerType = config['class_name']
        typeSpecificInfo = config['config']
        layerParents = config['inbound_nodes']
        node.setName(layerName)
        node.setTypeId(layerType)
        node.setInfos(typeSpecificInfo)
        node.setInputShape(model.layers[currentId].input_shape)
        node.setOutputShape(model.layers[currentId].output_shape)
        nodes[layerName] = node
        if layerName in outputLayerNames:
            node.setOutputLayer(True)
            outputNodes.append(node)

        if len(layerParents) == 0:
            node.addParent(root)
            inputNodes.append(node)
            node.setInputLayer(True)
        else:
            for p in layerParents:
                pname, px, py, pz = p
                parentNode = nodes[pname]
                parentNode.addChild(node)
                node.addParent(parentNode)

    return nodes, inputNodes, outputNodes, root

def formatRDDEvaluationDatasetCSV(sc, evaluationDataset, modelPredictions):
    """
        Build the RDD assigning the GT and Prediction to each sample of the
        evaluation dataset, and stringify it in a CSV format.
    """

    X, Y = evaluationDataset
    size = len(X)
    rdd = sc.range(size)
    rdd = rdd.map(lambda x : (x, Y[x], modelPredictions[x]))
    rdd = rdd.map(lambda x : str(x[0]) + "," + str(x[1]) + "," + str(x[2]))
    return rdd

def checkFileExistenceonHDFS(path):
    """
        Check for a  file's existence on HDFS, return False if it does not.
    """

    proc = subprocess.Popent(['hdfs', 'dfs', '-test', '-e', path])
    proc.communicate()
    return proc.returncode == 0

def computePredictionsRDD(activationsRDD, outputNodes):
    """
        Filter out non-output results from activations, and compute an argmax on
        them.
    """
    indexToKeep = list()
    for n in outputNodes:
        indexToKeep.append(n.getId)

    def keepOnlyOutputActivations(t):
        batchIndex, activations = t
        filteredActivations = list()
        for i in indexToKeep:
            filteredActivations.append(activations[i])
        return (batchIndex, filteredActivations)

    def computeArgmaxOnActivations(t):
        batchIndex, activations = t
        computedActivations = list()
        for activation in activations:
            value = np.argmax(activation)
            computedActivations.append(value)
        return (batchIndex, computedActivations)

    # rdd = activationsRDD.map(lambda x : (x[0], [[acts[i] for i in indexToKeep] for acts in x[1]]))
    rdd = activationsRDD.map(keepOnlyOutputActivations)
    #rdd = rdd.map(lambda x : (x[0], [[np.argmax(act) for act in acts] for acts in x[1]]))
    rdd = rdd.map(computeArgmaxOnActivations)
    # rdd = [(batchIndex, [[predOutput1, predOutput2], ...]), ...]
    return rdd

def flattenBatches(rdd):
    """
        Properly assign indexes based on batch index to elements, and return
        them. Perform a flatmap so rdd is the same size as dataset.
    """

    def assignLocalIndexOnBatches(t):
        batchIndex, dataArrays = t
        indexedDataArrays = list()
        for dataArrayIndex in range(len(dataArrays)):
            o = (dataArrayIndex, dataArrays[dataArrayIndex])
            indexedDataArrays.append(o)
        
        return (batchIndex, indexedDataArrays)

    def assignGlobalIndexOnBatches(t):
        batchIndex, indexedDataArrays = t
        globalIndexedDataArrays = list()
        for indexedDataArray in indexedDataArrays:
            localIndex, dataArrays = indexedDataArray
            o = (localIndex + batchIndex * batchSize, dataArrays)
            globalIndexedDataArrays.append(o)

        return globalIndexedDataArrays

    # rddc = rdd.map(lambda x : (x[0], [(y, x[1][y]) for y in range(len(x[1]))]))
    rddc = rdd.map(assignLocalIndexOnBatches)
    # rddc = rddc.flatMap(lambda x : [(y[0] + x[0] * batchSize, y[1]) for y in x[1]])
    rddc = rddc.flatMap(assignGlobalIndexOnBatches)
    return rddc

def collectModelPredictions(rdd, batchSize = 100):
    rddc = flattenBatches(rdd, batchSize)
    # rddc = [(sampleId, [predOut1, predOut2, ...])]
    return rddc.collect()

def defineForwardPropagationPaths():
    """
        Returns a list of possibles paths going from input nodes to output nodes
    """

    paths = list()
    def recFunc(currentPath, currentNode):
        path = currentPath.copy()
        path.append(currentNode)
        if currentNode.isOutputLayer():
            paths.append(path)
        for node in currentNode.getChildren():
            recFunc(path, node)
    
    return paths

def defineBackpropagationPaths(graphOutputNodes):
    """
        Returns a list of possibles paths going from output nodes to input nodes
    """

    paths = list()
    def recFunc(currentPath, currentNode):
        path = currentPath.copy()
        path.append(currentNode)
        if currentNode.isInputLayer():
            paths.append(path)
        for node in currentNode.getParents():
            recFunc(path, node)
    
    return paths

def keepActivationsWithIndex(rdd, indexToKeep):
    """
        Filter activations in batch by index
    """

    def keepIndexInBatch(t):
        batchIndex, dataArrays = t
        filteredDataArray = list()
        for data in dataArrays:
            filteredDataArray.append(data[indexToKeep])
        return (batchIndex, filteredDataArray)
    rddc = rdd.map(keepIndexInBatch)
    return rddc

def computeBP(activations, paths):
    """
        Process a backpropagation analysis on data
    """
    def compute(t):
        batchIndex, acts = t
        results = list()
        for act in acts:
            ppActs = funcBP(act, paths)
            results.append(ppActs)
        return (batchIndex, results)
    # BEWARE as activations can goes into another dimension to handle
    # multiple paths (one activation => two LRP'd computation if two paths)
    # how to handle duplicate data ?
    activations.map(compute)

def runPipeline(kerasModel, evaluationDataset):
    sc = initializeSparkContext()
    X, Y = evaluationDataset # X = inputs, Y = answers
    modelInfos = buildModelInfoGraph(kerasModel)
    modelGraphNodes, modelGraphInputNodes, modelGraphOutputNodes, modelGraphRoot = modelInfos
    modelActivationsRdd = computeActivations(sc, kerasModel, X)
    modelPredictionsRDD = computePredictionsRDD(modelActivationsRdd, modelGraphOutputNodes)
    modelPredictions = collectModelPredictions(modelPredictionsRDD)
    csvRdd = formatRDDEvaluationDatasetCSV(sc, evaluationDataset, modelPredictions)
    csvRdd.writeAsTextFile('csv')

    backPropagationPaths = defineBackpropagationPaths(modelGraphOutputNodes)
    # compute LRP using backPropagationPaths
    rddBP = computeBP(modelActivationsRdd, backPropagationPaths)
    for node in modelGraphOutputNodes:
        index = node.getId()
        rdd = keepActivationsWithIndex(rddBP, index)
        rddf = flattenBatches(rdd)
        rddf.writeAsPickleFile('lrp of index')
    
__author__ = "Adrien Halnaut"
__copyright__ = "Copyright 2020, Université de Bordeaux"
__credits__ = ["David Auber", "Romain Bourqui", "Romain Giot", "Adrien Halanut"]
__license__ = "GPL"
__version__ = "0.1"
__maintainer__ = "Adrien Halnaut"
__email__ = "adrien.halnaut@u-bordeaux.fr"
__status__ = "Dev"

