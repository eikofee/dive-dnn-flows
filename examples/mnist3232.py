import tensorflow
import sys
import numpy as np
from modelToActivations import fullStack, initialize 
pathToModelFile = sys.argv[1] # ../models/lenet5-mnist-Xe.h5
pathToDataFile = sys.argv[2] #.npz
K = tensorflow.keras

# (xTrain, yTrain), (xTest, yTest) = K.datasets.mnist.load_data()
dataset = np.load(pathToDataFile)
xTrain = dataset['x_train']
yTrain = dataset['y_train']
xTest = dataset['x_test']
yTest = dataset['y_test']
testCount = xTest.shape[0]
xTest = xTest.reshape(testCount, 28, 28, 1).astype('float32') / 255
# xTest = xTest.reshape(testCount, 32, 32, 1).astype('float32') / 255
xTest = xTest.repeat(3, axis=3)
# xTestPadded = tensorflow.pad(xTest, [[0, 0], [2, 2], [2, 2], [0, 0]])
xTestPadded = np.pad(xTest, ((0, 0), (2, 2), (2, 2), (0, 0)), 'edge')
yTest = K.utils.to_categorical(yTest, 10)
model = K.models.load_model(pathToModelFile)
initialize()
# fullStack('.', model, xTest, yTest, useLrp=False, writePickleFile=True, writeLrpPickleFile=False, writeInfo=True)
fullStack('./distances', model, xTestPadded[:10], yTest[:10], partitionSize=None, useLrp=True, writePickleFile=True, writeLrpPickleFile=True, writeDictionary=True, writeDistances=True, writeInfo=True)