import tensorflow
import sys
import numpy as np
sys.path.append("..")
from modelToActivations import fullStack, initialize 
pathToModelFile = sys.argv[1] # ../models/lenet5-mnist-Xe.h5
pathToDataFile = sys.argv[2] #.npz
argCount = None
if (len(sys.argv) > 3):
    argCount = int(sys.argv[3])
K = tensorflow.keras

# (xTrain, yTrain), (xTest, yTest) = K.datasets.mnist.load_data()
dataset = np.load(pathToDataFile)
xTrain = dataset['x_train']
yTrain = dataset['y_train']
xTest = dataset['x_test']
yTest = dataset['y_test']
# trainCount = xTrain.shape[0]
testCount = xTest.shape[0]

# format into (count, h, w, channels)
# xTrain = xTrain.reshape(trainCount, 28, 28, 1).astype('float32') / 255
xTest = xTest.reshape(testCount, 28, 28, 1).astype('float32') / 255
inputShape = (28, 28, 1)

# format from (7, 1, 4, ...) to [[0, 0, 0, 0, 0, 0, 1, 0, 0, 0], [1, 0, 0, 0, ...], [0, 0, 0, 1, ...], ...]
# yTrain = K.utils.to_categorical(yTrain, 10)
yTest = K.utils.to_categorical(yTest, 10)

model = K.models.load_model(pathToModelFile)
print("Testing model:")
model.evaluate(xTest, yTest)
initialize()
fullStack('./distances-mnist', model, xTest, yTest, count=argCount, useLrp=True, writePickleFile=True, writeLrpPickleFile=False, writeInfo=True)