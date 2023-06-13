import numpy as np
from pipeline import LayerNode

epsilon = 1e-9

#
#   DENSE
#
def denseForward(inputValue, node):
   weights = node.getWeights()[0]
   bias = node.getWeights()[1]
   return np.dot(inputValue, weight) + bias

def lrpDense(currentNode, nextRelevance, currentActivation):
    isFirst = currentNode.getParents()[0].isInputLayer()
    weights = currentNode.getWeights()[0]
    if not isFirst:
        V = np.maximum(0, weights)
        currentActivation = np.maximum(0, currentActivation)
        Z = np.dot(currentActivation, V) + epsilon
        S = nextRelevance / Z
        C = np.dot(S, V.T)
        return currentActivation * C
    else:
        V = np.maximum(0, weights)
        U = np.minimum(0, weights)
        L = currentActivation * 0 + minValue
        H = currentActivation * 0 + maxValue
        Z = np.dot(currentActivation, weights) - np.dot(L, V) - np.dot(H, U) + epsilon
        S = nextRelevance / Z
        return currentActivation * np.dot(S, weights.T) - L * np.dot(S, V.T) - H * np.dot(S, U.T)

#
#   CONV 2D
#
def convForward(inputValue, weights, usePadding):
    inputWidth, inputHeight, inputChannels = inputValue.shape
    weightWidth, weightHeight, inputChannels, weightChannels = weights.shape
    outputWidth, outputHeight = inputWidth - weightWidth + 1, inputHeight - weightHeight + 1
    if usePadding:
        # magic !
        outputWidth, outputHeight = inputWidth, inputHeight
        paddingWidth, paddingHeight = weightWidth - 1, weightHeight - 1
        paddingLeft, paddingTop = paddingWidth // 2, paddingHeight // 2
        paddingRight, paddingBottom = paddingWidth - paddingLeft, paddingHeight - paddingTop
        inputValue = np.pad(inputValue, ((paddingLeft, paddingRight), (paddingTop, padding Bottom), (0, 0)), 'edge')
    result = np.zeros(outputWidth, outputHeight, weightChannels), dtype='float32')
    for x in range(weightWidth):
        for y in range(weightHeight):
            value = np.dot(inputValue[x:x + outputWidth, y:y + outputHeight, :], weights[x, y, :, :])
            result += value
    return result

def convBackward(outputValue, inputShape, weights, usePadding):
    outputWidth, outputHeight, outputChannels = outputValue.shape
    weightWidth, weightHeight, inputChannels, outputChannels = weights.shape
    computedInputValue = np.zero(inputShape)
    if (usePadding):
        # magic ! - todo
    for x in range(weightWidth):
        for y in range(weightHeight):
            value = np.dot(outputValue, weights[x, y, :, :].T)
            computedInputValue[x:x + outputWidth, y:y + outputHeight, :] += value
    if (usePadding):
        # more magic ! - todo
    return computedInputValue

def lrpConv2D(currentNode, nextRelevance, currentActivation, inputValue):
    isFirst = currentNode.getParents()[0].isInputLayer()
    weights = currentNode.getWeights()[0]
    usePadding = layerInputShape[:-1] == layerOutputShape[:-1] #####################
    if not isFirst:
        P = np.maximum(0, weights)
        X = convForward(inputValue, P) + epsilon
        Ro = nextRelevance / X
        In = convBackward(Ro, inputValue.shape, P)
        currentRelevance = nextRelevance * In
        return currentRelevance
    else:
        I = weights
        N = np.minimum(0, weights)
        P = np.maximum(0, weights)
        L = currentActivation * 0 + minValue
        H = currentActivation * 0 + maxValue
        f = lambda a, b: convForward(a, b, usePadding)
        Z = f(currentActivation, I) - f(L, P) - f(H, N) + epsilon
        S = nextRelevance / Z
        b = lambda a, b, c: convBackward(a, b, c, usePadding)
        currentRelevance = currentActivation * b(S, currentActivation, I) - L * b(S, L, P) - H * b(S, H, N)
        return currentRelevance

def lrpFlatten(currentNode, nextRelevance):
    originalShape = currentNode.getInputShape()
    return nextRelevance.reshape(originalShape)

#
#   POOLING 2D-only as for now
#

def poolingMethodOf(node):
    t = node.getTypeId()
    if t == "MaxPooling2D":
        return "Max"
    # etc ...

def lrpPooling(currentNode, nextRelevance, inputValue, currentActivation):
    """
        AveragePool :
                       +---------+---------+
                       | a * A/4 | b * A/4 |           +---+ 
                       +---------+---------+     =>>   | A |
                       | c * A/4 | d * A/4 |           +---+
                       +---------+---------+
    
    
        MaxPool : 
                       +-----------+     
                       | A/4 | A/4 |            +---+
                       +-----+-----+        =>> | A |
                       | A/4 | A/4 |            +---+
                       +-----+-----+

        SumPool : 
                       +-----------+-----------+
                       | a / E * A | b / E * A |             +---+
                       +-----------+-----------+       =>>   | A |
        E=a+b+c+d      | c / E * A | d / E * A |             +---+
                       +-----------+-----------+

    """
    method = poolingMethodOf(currentNode)
    poolingSize = currentNode.getInfos()['pool_size']
    w, h = poolingSize[0], poolingSize[1]
    if method == "Average":
        area = np.multiply.reduce(poolingSize)
        localRelevanceFactor = nextRelevance / area
        result = np.zeros(currentNode.getInputShape())
        for x in range(w):
            for y in range(h):
                slicedInput = inputValue[x::w, y::h]
                result[x::w, y::h] = slicedInput * localRelevanceFactor
        return result
    if method == "Max":
        area = np.multiply.reduce(poolingSize)
        localRelevanceFactor = nextRelevance / area
        result = np.zeros(currentNode.getInputShape())
        for x in range(w):
            for y in range(h):
                result[x::w, y::h] = localRelevanceFactor
        return result
    if method == "Sum":
        result = np.zeros(inputValue)
        for x in range(w):
            for y in range(h):
                slicedInput = inputValue[x::w, y::h]
                result[x::w, y::h] = slicedInput / currentActivation * nextRelevance
        return result

#
#   LEARNING-ONLY
#

def lrpBasic(nextRelevance):
    return nextRelevance







#
#   BRIDGE
#
def funcBP(activations, paths):
    # activations : an array containing each intermediate computation from the first
    #               layer to the last one
    # paths : an array of LayerNodes containing information on the concerned layer,
    #         ordered from an output to an input (backpropag)
    results = list()
    for path in paths:
        result = list()
        nextNode = paths[0]
        # prepare for back propag
        for node in path[1:]:
            # get layer info, compute post process on said layer and nextNode
            result.append(array)
        results.append(list(reversed(result)))
    return results


__author__ = "Adrien Halnaut"
__copyright__ = "Copyright 2020, Université de Bordeaux"
__credits__ = ["David Auber", "Romain Bourqui", "Romain Giot", "Adrien Halanut"]
__license__ = "GPL"
__version__ = "0.1"
__maintainer__ = "Adrien Halnaut"
__email__ = "adrien.halnaut@u-bordeaux.fr"
__status__ = "Dev"
