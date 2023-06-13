import tensorflow as tf
from tensorflow import keras
from tensorflow.python.keras.models import Model
from tensorflow.python.keras import backend as K
import sys
import os.path
import copy
import json
import numpy as np
from pyspark import SparkContext, SparkConf, StorageLevel
from pyspark.sql import SparkSession
from scipy.spatial import distance
import tensorflow.compat.v1 as tfcompat
import subprocess

tfcompat.disable_v2_behavior()

sc = None
epsilon = 1e-9
minValue = 0
maxValue = 1

def initialize():
    """
        Initialize Spark environment
    """

    global sc
    spark = SparkSession.builder.getOrCreate()
    sc = spark.sparkContext


def getActivations(model, testSet):
    """
        Extract final and intermediate activations values for a given model and evaluation dataset.
        The commented part works somewhat better but is very restricted to keras models, the actual
        code sets as a output each layer of the model. A better way to do this would be to add an
        output layer to each original layer I guess.
    """
    # funActivations = keras.backend.function([model.layers[0]],
    #                             [currentLayer.output for currentLayer in model.layers[1:]])
    # activations = funActivations(testSet)


    colander = keras.models.Model(inputs=model.inputs, outputs=[layer.output for layer in model.layers[1:]])
    activations = colander.predict(testSet)
    return activations

def getLayerInfos(model):
    """
        Builds a dictionary regrouping various informations about the model. To be rewritten in
        order to deal with non-linear/sequential models.
    """

    res = dict()
    layersFromModelConfig = model.get_config()["layers"]
    print(len(layersFromModelConfig))
    layersFromModel = model.layers
    print(len(layersFromModel))
    outConnections = dict()
    layers = []
    for i in range(len(layersFromModel)):
        layers.append((layersFromModelConfig[i], layersFromModel[i]))
    for layer in layers:
        layerConfig = layer[0]
        layerObject = layer[1]
        weights = 0
        layerInputShape = 0
        layerName = layerConfig["config"]["name"]
        layerType = layerConfig['class_name']
        print(layerName + ":" + layerType)
        # if layerType != "InputLayer":
        layerInputShape = layerObject.input_shape[1:]
        outputShape = layerObject.output_shape[1:]
        incLayers = []
        if len(layerConfig["inbound_nodes"]) > 0:
            for i in range(len(layerConfig["inbound_nodes"][0])):
                k = layerConfig["inbound_nodes"][0][i][0]
                if k not in outConnections.keys(): 
                    outConnections[k] = list()
                outConnections[k].append(layerName)
                incLayers.append(k)
        if layerType == "Dense" or layerType == "Conv2D":
            weights = layerObject.get_weights()[0]
        elif layerType == "Flatten" or layerType == "Dropout":
            weights = 0
            layerInputShape = layerObject.input_shape[1:]
        elif layerType == "MaxPooling2D" or layerType == "AveragePooling2D":
            weights = layerConfig["config"]["pool_size"]
            layerInputShape = layerObject.input_shape[1:]
        elif layerType == "ReLU":
            weights = 0
            layerInputShape = layerObject.input_shape[1:]
        elif layerType == "Activation":
            if layerConfig["config"]["activation"] == "tanh":
                layerType = "TanH"
        elif layerType == "Concatenate":
            weights = layerConfig["config"]["axis"]
            layerInputShape = np.array(layerObject.input_shape)[:, 1:]
        res[layerName] = (layerType, weights, layerInputShape, outputShape, incLayers)
    for k in res.keys():
        if k in outConnections.keys():
            res[k] = res[k] + (outConnections[k],)
        else:
            res[k] = res[k] + ([],)
    return res

def createTestDataDictionary(testData, testDataAnswers, modelOutputResults):
    """
        Builds the RDD regrouping evaluation data IDs, GTs and Predictions.
    """

    data = sc.range(len(testData))
    data = data.map(lambda x: (x, np.argmax(testDataAnswers[x]), np.argmax(modelOutputResults[x])))
    data = data.map(lambda t: str(t[0]) + "," + str(t[2]) + "," + str(t[1]))
    return data

def writeTestDataDictionary(path, testData, testDataAnswers, modelOutputResults):
    """
        Write the RDD computed above.
    """

    data = createTestDataDictionary(testData, testDataAnswers, modelOutputResults)
    data.saveAsTextFile(path)

def computeLrp5(layerActivations, singleInputData, layerInfo, layerNames):
    """
        Fifth iteration of computing LRP on the collected activations. To be rewritten
        a sixth time to abstract the post-processing into an external file.
    """


    layerCount = len(layerActivations)
    # R is the intermediate LRP'ed result being back propagated
    R = layerActivations[-1]
    result = []
    result.append(np.copy(R))
    for index in range(layerCount, 0, -1):
        isFirstLayer = index == 1
        layerName = layerNames[index]
        print(layerName)
        (layerType, layerWeight, layerInputShape, layerOutputShape, inputLayers, outputLayers) = layerInfo[layerName]
        # Xi is the intermediate result to be LRP'ed
        Xi = 0
        if isFirstLayer:
            Xi = singleInputData
        else:
            Xi = layerActivations[index-2]
        
        def defaultLrpFunction(a, b, c):
            print("Function not set")
        
        lrpFunction = defaultLrpFunction
        
        if layerType == "Dense":
            forwardFunction = lambda inputValue, weight, bias: np.dot(inputValue, weight) + bias
            if isFirstLayer:
                def denseLrpFirstFunc(r, xi, weight):
                    v = np.maximum(0, weight)
                    u = np.minimum(0, weight)
                    l = xi * 0 + minValue
                    h = xi * 0 + maxValue
                    z = np.dot(xi, weight) - np.dot(l, v) - np.dot(h, u) + epsilon
                    s = r / z
                    return xi * np.dot(s, weight.T) - l * np.dot(s, v.T) - h * np.dot(s, u.T)
                lrpFunction = denseLrpFirstFunc
            else:
                def denseLrpFunc(r, xi, weight):
                    v = np.maximum(0, weight)
                    xi = np.maximum(0, xi)
                    z = np.dot(xi, v) + epsilon
                    s = r / z
                    c = np.dot(s, v.T)
                    return xi * c
                lrpFunction = denseLrpFunc
        elif layerType == "Conv2D":
            print("a conv layer")
            def convForwardFunc(inputValue, weight, useSameSize):
                inputWidth, inputHeight, inputChannels = inputValue.shape
                weightWidth, weightHeight, inputChannels, weightChannels = weight.shape
                outputWidth, outputHeight = inputWidth - weightWidth + 1, inputHeight - weightHeight + 1
                outputPostPadWidth, outputPostPadHeight = outputWidth, outputHeight
                if (useSameSize):
                    outputPostPadWidth, outputPostPadHeight = inputWidth, inputHeight
                    # outputWidth, outputHeight = outputWidth + weightWidth - 1, outputHeight + weightHeight - 1
                    inputPostPadWidth, inputPostPadHeight = outputPostPadWidth + weightWidth - 1, outputPostPadHeight + weightHeight - 1
                    paddingWidth, paddingHeight = inputPostPadWidth - inputWidth, inputPostPadHeight - inputHeight
                    paddingTop, paddingLeft = paddingHeight // 2, paddingWidth // 2
                    paddingBottom, paddingRight = paddingHeight - paddingTop, paddingWidth - paddingLeft
                    inputValue = np.pad(inputValue, ((paddingLeft, paddingRight), (paddingTop, paddingBottom), (0, 0)), 'edge')
                # O = np.zeros([outputPostPadWidth, outputPostPadHeight, weightChannels], dtype='float32')
                O = np.zeros([outputPostPadWidth, outputPostPadHeight, weightChannels], dtype='float32')
                for i in range(weightWidth):
                    for j in range(weightHeight):
                        # v = np.dot(inputValue[i:i + outputWidth, j:j + outputHeight, :], weight[i, j, :, :])
                        v = np.dot(inputValue[i:i + outputPostPadWidth, j:j + outputPostPadHeight, :], weight[i, j, :, :])
                        O += v
                return O
            forwardFunction = lambda a, b : convForwardFunc(a, b, layerInputShape[:-1] == layerOutputShape[:-1])
            def convBackwardFunc(relativeOutputValue, trueInputValue, weight, useSameSize):
                outputWidth, outputHeight, outputChannels = relativeOutputValue.shape
                weightWidth, weightHeight, inputChannels, outputChannels = weight.shape
                computedInputValue = trueInputValue * 0
                if (useSameSize):
                    outputPostPadWidth, outputPostPadHeight = outputWidth, outputHeight
                    # outputWidth, outputHeight = outputWidth + weightWidth - 1, outputHeight + weightHeight - 1
                    inputPostPadWidth, inputPostPadHeight = outputPostPadWidth + weightWidth - 1, outputPostPadHeight + weightHeight - 1
                    computedInputValue = np.zeros((inputPostPadWidth, inputPostPadHeight, inputChannels))
                for i in range(weightWidth):
                    for j in range(weightHeight):
                        v = np.dot(relativeOutputValue, weight[i,j,:,:].T)
                        computedInputValue[i:i + outputWidth, j:j + outputHeight, :] += v
                if (useSameSize):
                    paddingWidth, paddingHeight = inputPostPadWidth - outputWidth, inputPostPadHeight - outputHeight
                    paddingTop, paddingLeft = paddingHeight // 2, paddingWidth // 2
                    paddingBottom, paddingRight = paddingHeight - paddingTop, paddingWidth - paddingLeft
                    computedInputValue = computedInputValue[paddingLeft:inputPostPadWidth - paddingRight, paddingTop:inputPostPadHeight - paddingBottom, :] 
                return computedInputValue
            backwardFunction = lambda a, b ,d: convBackwardFunc(a, b, d, layerInputShape[:-1] == layerOutputShape[:-1])
            if isFirstLayer:
                def convLrpFirstFunc(r, xi, weight):
                    iself = weight
                    nself = np.minimum(0, weight)
                    pself = np.maximum(0, weight)
                    l = xi * 0 + minValue 
                    h = xi * 0 + maxValue
                    z = forwardFunction(xi, iself) - forwardFunction(l, pself) - forwardFunction(h, nself) + epsilon
                    s = r / z
                    r = xi * backwardFunction(s, xi, iself) - l * backwardFunction(s, l, pself) - h * backwardFunction(s, h, nself)
                    return r
                lrpFunction = convLrpFirstFunc
            else:
                def convLrpFunc(lrpOutputValue, trueInputValue, weight):
                    positiveWeight = np.maximum(0, weight)
                    computedOutputValue = forwardFunction(trueInputValue, positiveWeight) + epsilon
                    relativeOutputValue = lrpOutputValue / computedOutputValue
                    computedInputValue = backwardFunction(relativeOutputValue, trueInputValue, positiveWeight)
                    lrpInputValue = trueInputValue * computedInputValue
                    return lrpInputValue
                lrpFunction = convLrpFunc
        elif layerType == "Flatten":
            def lrpFlatten(R, Xi, weight):
                res = R.reshape(Xi.shape)
                return res
            lrpFunction = lrpFlatten 
        elif layerType == "MaxPooling2D" or layerType == "AveragePooling2D":
            # def poolingForwardFunction(Xi, weight):
            #     pools = [Xi[x::weight[0], y::weight[1]] for ((x, y), _) in np.ndenumerate(np.zeros(weight))]
            #     # return np.amax(pools, axis = 0)
            #     return np.average(pools, axis = (1,2))
            # def poolingBackwardFunction(Xo, Xi, weight):
            #     ssp = np.zeros(layerInputShape)
            #     Xout = poolingForwardFunction(Xi, weight)
            #     for ((x, y), _) in np.ndenumerate(np.zeros(weight)):
            #         sp = Xi[x::weight[0], y::weight[1]] == Xout
            #         ssp[x::weight[0], y::weight[1]] = sp
            #     strideArray = np.zeros((int(ssp.shape[0]/weight[0]), int(ssp.shape[1]/weight[1])))
            #     kMatrix = np.zeros(layerInputShape)
            #     for ((x, y), _) in np.ndenumerate(strideArray):
            #         p = ssp[weight[0] * x:weight[0] * (x + 1), weight[1] * y:weight[1] * (y + 1)]
            #         k = np.sum(p, axis = (0,1))
            #         kMatrix[x, y] = k
            #         ssp[weight[0] * x:weight[0] * (x + 1), weight[1] * y:weight[1] * (y + 1)] /= k
            #         ssp[weight[0] * x:weight[0] * (x + 1), weight[1] * y:weight[1] * (y + 1)] *= Xo[x, y]
            #     return ssp
            def poolingBackwardFunction(s, Xi, w):
                finalValue = s
                startValue = Xi
                poolSize = w
                area = w[0] * w[1]
                adaptedFinalValue = finalValue / area
                result = startValue * 0
                for x in range(poolSize[0]):
                    for y in range(poolSize[1]):
                        slicedStartValue = startValue[x::poolSize[0], y::poolSize[1]]
                        result[x::poolSize[0], y::poolSize[1]] = slicedStartValue * adaptedFinalValue
                return result
            def poolingLrpFunction(r, Xi, w):
                s = r
                c = poolingBackwardFunction(s, Xi, w)
                r = c
                return r
            lrpFunction = poolingLrpFunction
        elif layerType == "Dropout" or layerType == "ReLU":
            lrpFunction = lambda R, o, s : R
        elif layerType == "TanH":
            lrpFunction = lambda R, o, s : R
        R = lrpFunction(R, Xi, layerWeight)
        result.append(np.copy(R))
    return list(reversed(result))

def broadcastActivations(activations, itemCount, partitionSize):
    """
        Broadcasts data across machines in order to compute LRP/Backpropagation
        method. Should be reconsidered to compute samples by batches ?
    """

    res = []
    # print(len(activations)) print(activations) print(layerCount)
    for layerIndex in range(len(activations)):
        subRes = []
        print('broadcasting ' + str(activations[layerIndex].shape) + '...')
        partitionCount = itemCount//partitionSize
        for ii in range(partitionCount):
            print('--- Part ' + str(ii + 1) + ' of ' + str(partitionCount))  
            # subRes.append(sc.broadcast(activations[layerIndex][ii * partitionSize : min(itemCount, (ii + 1) * partitionSize)]))
            subRes.append(sc.broadcast(activations[layerIndex][ii * partitionSize : min(itemCount, (ii + 1) * partitionSize)]))
            print(subRes[ii].value.shape)
        # res.append(sc.broadcast(activations[i]))
        res.append(subRes)
    
    return res

def computeDistances3(activations, layerCount, itemCount, partitionSize, path):
    """
        Compute distances between post-processed samples, should be replaced by the function
        in the other external file.
    """


    for layer in range(layerCount):
        # subAct = activations.map(lambda x: (x[0], x[1][layer])).cache()
        subAct = activations.map(lambda x: (x[0], x[1][layer]))
        bActivations = sc.broadcast(subAct.collect())
        def distFunc(t):
            x, y = t
            if x == y:
                return ((x, y), 0)
            else:
                return ((x, y), np.linalg.norm(bActivations.value[x].reshape(-1) - bActivations.value[y].reshape(-1))) 
            
        indexes = sc.range(itemCount).flatmap(lambda x : [(x, y) for y in range(x, itemCount)]).coalesce(1000)
        # cart = subAct.cartesian(subAct).filter(lambda t: t[0][0] > t[1][0]).coalesce(1000).map(lambda t: ((t[0][0], t[1][0]), 1 - distance.cosine(t[0][1].reshape(-1), t[1][1].reshape(-1))))
        # cart = subAct.cartesian(subAct).filter(lambda t: t[0][0] > t[1][0]).coalesce(1000).map(lambda t : ((t[0][0], t[1][0]), np.linalg.norm(t[0][1].reshape(-1) - t[1][1].reshape(-1))))
        dists = indexes.map(distFunc)
        cart = dists
        cart.saveAsPickleFile(path + '/distancesMatrixLayer' + str(layer) + 'RDD.seq')
        cart.map(lambda t : str(t[0][0]) + " " + str(t[0][1]) + " " + str(t[1])).saveAsTextFile(path + '/distancesLayer' + str(layer))
        # subAct.unpersist()
    


def checkFileExistence(path):
    """
        Check if the file exists on HDFS (crashes on a local machine if the line below is
        left commented).
    """

    # uncomment this to use on local machine
    # return False
    proc = subprocess.Popen(['hdfs', 'dfs', '-test', '-e', path])
    proc.communicate()
    return proc.returncode == 0


def fullStack(path, model, inputData, inputDataAnswers, count=None, partitionSize=None, useLrp=True, writePickleFile=True, writeLrpPickleFile=True, writeDictionary=True, writeDistances=True, writeInfo=True):
    """
        Full pipeline
    """

    activations = getActivations(model, inputData)
    layerCount = len(activations)
    itemCount = len(inputData)
    layerInfos = getLayerInfos(model)
    layerNames = []
    useBroadcast = not checkFileExistence(path + "/activations.seq")
    if (count != None and count <= itemCount):
        itemCount = count
    if (partitionSize == None):
        partitionSize = min(1000, itemCount)
    for x in model.get_config()["layers"]:
        layerNames.append(x["config"]["name"])
    inputData = inputData[:itemCount + 1]
    inputDataAnswers = inputDataAnswers[:itemCount + 1]
    print("Layer names :")
    print(layerNames)
    print("==============")
    sc.setJobGroup("", "Activation broadcasting")
    for x in range(len(activations)):
        print(str(activations[x].shape) + ":" + layerNames[x+1] + ":" + str(np.array(layerInfos[layerNames[x+1]][1]).shape))
    activationsBroadcastByLayer = []
    if useBroadcast:
        activationsBroadcastByLayer = broadcastActivations(activations, itemCount, partitionSize)
    dataRange = sc.range(itemCount)
    if checkFileExistence(path + "/activations.seq"):
        dataRdd = sc.pickleFile(path + "/activations.seq").setName("raw activations RDD (read from hdfs)").cache()
    else:
        # dataRdd = dataRange.map(lambda x : (x, [activationsBroadcastByLayer[layerIndex][x//partitionSize - 1].value[x%partitionSize] for layerIndex in range(layerCount)]))
        sc.setJobGroup("", "Indexing raw activations")
        dataRdd = dataRange.map(lambda x : (x, [activationsBroadcastByLayer[layerIndex][x//partitionSize].value[x%partitionSize] for layerIndex in range(layerCount)])).setName("raw activations RDD").cache()
        if (writePickleFile):
            sc.setJobGroup("", "Writing raw activations")
            dataRdd.saveAsPickleFile(path + "/activations.seq")

    if (useLrp):
        if checkFileExistence(path + "/activationsLRP.seq"):
            sc.setJobGroup("", "Reading LRP'd activations from hdfs")
            dataRdd = sc.pickleFile(path + "/activationsLRP.seq").setName("LRP'd activations RDD (read from hdfs)").persist(StorageLevel(False, True, False, False, 1))
        else:
            sc.setJobGroup("", "Computing LRP'd activations")
            dataRdd = dataRdd.map(lambda x : (x[0], computeLrp5(x[1], inputData[x[0]], layerInfos, layerNames))).setName("LRP'd activations RDD").persist(StorageLevel(False, True, False, False, 1))
            if (writeLrpPickleFile):
                sc.setJobGroup("", "Writing LRP'd activations")
                dataRdd.saveAsPickleFile(path + "/activationsLRP.seq")

    # result = computeDistances(dataRdd, layerCount, itemCount, partitionSize, path)
    sc.setJobGroup("", "Computing and writing distances")
    computeDistances3(dataRdd, layerCount, itemCount, partitionSize, path)
    if useBroadcast:
        for x in activationsBroadcastByLayer:
            for x2 in x:
                x2.destroy()

    # if (writeDistances):
    #     outputDistances(result, layerCount, path)
    # else:
    #     result.count() #for testing
    
    if (writeDictionary):
        writeTestDataDictionary(path + "/DataDictionary.csv", inputData, inputDataAnswers, activations[-1])
        
        
__author__ = "Adrien Halnaut"
__copyright__ = "Copyright 2020, Université de Bordeaux"
__credits__ = ["David Auber", "Romain Bourqui", "Romain Giot", "Adrien Halanut"]
__license__ = "GPL"
__version__ = "0.1"
__maintainer__ = "Adrien Halnaut"
__email__ = "adrien.halnaut@u-bordeaux.fr"
__status__ = "Dev"

