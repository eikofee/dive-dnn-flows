# Code inspired from https://web.archive.org/web/20190805195000/http:/www.heatmapping.org/tutorial/


import numpy as np

epsilon = 1e-9
minValue = 0
maxValue = 1

def defaultLrpFunction(R, Xi, weight):
    print("Function not set")

##### Dense

def denseForwardFunction(inputValue, weight, bias):
    result = np.dot(inputValue, weight) + bias
    return result

def denseLrpFunction(R, Xi, weight):
    positiveWeight = np.maximum(0, weight)
    positiveXi = np.maximum(0, Xi)
    Z = np.dot(positiveXi, positiveWeight) + epsilon
    S = R / Z
    C = np.dot(S, positiveWeight.T)
    result = positiveXi * C
    return result

def denseFirstLrpFunction(R, Xi, weight):
    positiveWeight = np.maximum(0, weight)
    negativeWeight = np.minimum(0, weight)
    lowMatrix = Xi * 0 + minValue
    highMatrix = Xi * 0 + maxValue
    Z = np.dot(Xi, weight) - np.dot(lowMatrix, positiveWeight) - np.dot(highMatrix, negativeWeight) + epsilon
    S = R / Z
    result = Xi * np.dot(S, weight.T) - lowMatrix * np.dot(S, positiveWeight.T) - highMatrix * np.dot(S, negativeWeight.T)
    return result

##### Conv2D

# 'keepInputSize' handles Conv2D layers using 'padding=same' configuration :
# https://stackoverflow.com/questions/37674306/what-is-the-difference-between-same-and-valid-padding-in-tf-nn-max-pool-of-t
# ^ second answer
def convForwardFunction(inputValue, weight, keepInputSize):
    # Compute output shape
    inputWidth, inputHeight, inputChannels = inputValue.shape
    weightWidth, weightHeight, inputChannels, weightChannels = weight.shape
    outputWidth, outputHeight = inputWidth - weightWidth + 1, inputHeight - weightHeight + 1

    # Handles padding
    outputPostPadWidth, outputPostPadHeight = outputWidth, outputHeight
    if (keepInputSize):
        outputPostPadWidth, outputPostPadHeight = inputWidth, inputHeight
        inputPostPadWidth, inputPostPadHeight = outputPostPadWidth + weightWidth - 1, outputPostPadHeight + weightHeight - 1
        paddingWidth, paddingHeight = inputPostPadWidth - inputWidth, inputPostPadHeight - inputHeight
        paddingTop, paddingLeft = paddingHeight // 2, paddingWidth // 2
        paddingBottom, paddingRight = paddingHeight - paddingTop, paddingWidth - paddingLeft
        inputValue = np.pad(inputValue, ((paddingLeft, paddingRight), (paddingTop, paddingBottom), (0, 0)), 'constant')
    
    # Apply convolution
    result = np.zeros([outputPostPadWidth, outputPostPadHeight, weightChannels], dtype='float32')
    for i in range(weightWidth):
        for j in range(weightHeight):
            value = np.dot(inputValue[i:i + outputPostPadWidth, j:j + outputPostPadHeight, :], weight[i, j, :, :])
            result += value
    return result

def convBackwardFunction(lrpOutputValue, inputValue, weight, useSameSize):
    outputWidth, outputHeight, outputChannels = lrpOutputValue.shape
    weightWidth, weightHeight, inputChannels, outputChannels = weight.shape
    computedInputValue = inputValue * 0
    if (useSameSize):
        outputPostPadWidth, outputPostPadHeight = outputWidth, outputHeight
        inputPostPadWidth, inputPostPadHeight = outputPostPadWidth + weightWidth - 1, outputPostPadHeight + weightHeight - 1
        computedInputValue = np.zeros((inputPostPadWidth, inputPostPadHeight, inputChannels))
    for i in range(weightWidth):
        for j in range(weightHeight):
            v = np.dot(lrpOutputValue, weight[i,j,:,:].T)
            computedInputValue[i:i + outputWidth, j:j + outputHeight, :] += v
    if (useSameSize):
        paddingWidth, paddingHeight = inputPostPadWidth - outputWidth, inputPostPadHeight - outputHeight
        paddingTop, paddingLeft = paddingHeight // 2, paddingWidth // 2
        paddingBottom, paddingRight = paddingHeight - paddingTop, paddingWidth - paddingLeft
        computedInputValue = computedInputValue[paddingLeft:inputPostPadWidth - paddingRight, paddingTop:inputPostPadHeight - paddingBottom, :] 
    return computedInputValue

def convFirstLrpFunction(R, Xi, weight):
    useSameSize = R.shape[:-1] == Xi.shape[:-1]
    negativeWeight = np.minimum(0, weight)
    positiveWeight = np.maximum(0, weight)
    l = Xi * 0 + minValue 
    h = Xi * 0 + maxValue
    Z = convForwardFunction(Xi, weight, useSameSize) - convForwardFunction(l, positiveWeight, useSameSize) - convForwardFunction(h, negativeWeight, useSameSize) + epsilon
    S = R / Z
    R = Xi * convBackwardFunction(S, Xi, weight, useSameSize) - l * convBackwardFunction(S, l, positiveWeight, useSameSize) - h * convBackwardFunction(S, h, negativeWeight, useSameSize)
    return R

def convLrpFunction(R, Xi, weight):
    useSameSize = R.shape[:-1] == Xi.shape[:-1]
    positiveWeight = np.maximum(0, weight)
    computedOutputValue = convForwardFunction(Xi, positiveWeight, useSameSize) + epsilon
    relativeOutputValue = R / computedOutputValue
    computedInputValue = convBackwardFunction(relativeOutputValue, Xi, positiveWeight, useSameSize)
    lrpInputValue = Xi * computedInputValue
    return lrpInputValue

# Does nothing but reshape as instructed in the LRP paper
def lrpFlattenFunction(R, Xi, weight):
    res = R.reshape(Xi.shape)
    return res

# Activation functions aren't affecting LRP values as instructed in the LRP
# paper + their implementation
lrpPass = lambda R, Xi, weight: R
dropoutLrpFunction = lrpPass
reLULrpFunction = lrpPass
tanHLrpFunction = lrpPass

# weight parameter is fake, only to carry the pool size into the pipeline
def poolingBackwardFunction(S, Xi, weight):
    finalValue = S
    startValue = Xi
    poolSize = weight
    area = weight[0] * weight[1]
    adaptedFinalValue = finalValue / area
    result = startValue * 0
    for x in range(poolSize[0]):
        for y in range(poolSize[1]):
            slicedStartValue = startValue[x::poolSize[0], y::poolSize[1]]
            result[x::poolSize[0], y::poolSize[1]] = slicedStartValue * adaptedFinalValue
    return result

def poolingLrpFunction(R, Xi, weight):
    s = R
    c = poolingBackwardFunction(s, Xi, weight)
    R = c
    return R
    
__author__ = "Adrien Halnaut"
__copyright__ = "Copyright 2020, Université de Bordeaux"
__credits__ = ["David Auber", "Romain Bourqui", "Romain Giot", "Adrien Halanut"]
__license__ = "GPL"
__version__ = "0.1"
__maintainer__ = "Adrien Halnaut"
__email__ = "adrien.halnaut@u-bordeaux.fr"
__status__ = "Dev"
