import tensorflow
import sys
import numpy as np

epochs = 1
if len(sys.argv) > 3:
    epochs = int(sys.argv[3])

K = tensorflow.keras

(xTrain, yTrain), (xTest, yTest) = K.datasets.mnist.load_data()
trainCount = xTrain.shape[0]
testCount = xTest.shape[0]

# format into (count, h, w, channels)
xTrain = xTrain.reshape(trainCount, 28, 28, 1).astype('float32') / 255
xTest = xTest.reshape(testCount, 28, 28, 1).astype('float32') / 255
xTrain = xTrain.repeat(3, axis=3)
xTest = xTest.repeat(3, axis=3)
xTrainPadded = tensorflow.pad(xTrain, [[0, 0], [2, 2], [2, 2], [0, 0]])
xTestPadded = tensorflow.pad(xTest, [[0, 0], [2, 2], [2, 2], [0, 0]])
inputShape = (32, 32, 3)
# format from (7, 1, 4, ...) to [[0, 0, 0, 0, 0, 0, 1, 0, 0, 0], [1, 0, 0, 0, ...], [0, 0, 0, 1, ...], ...]
yTrain = K.utils.to_categorical(yTrain, 10)
yTest = K.utils.to_categorical(yTest, 10)

if len(sys.argv) <= 2:
    vgg16 = K.applications.VGG16(weights='imagenet', include_top=False)
    vgg16.trainable = False
    vgg16.summary()
    inputLayer = K.layers.Input(shape=inputShape, name='image_input')
    newvgg16 = vgg16(inputLayer)
    model = K.models.Model(inputs=inputLayer, outputs=newvgg16)
    model.compile(loss = K.losses.categorical_crossentropy, optimizer = K.optimizers.Adadelta(), metrics = ['accuracy'])
    result = []
    newShape = (10,) + (xTrain.shape[0]/10,) + xTrain.shape[1:]
    xTrain = xTrain.reshape(newShape)
    for x in xTrain:
        print("this line should be displayed 10 times")
        xx = tensorflow.pad(x, [[0, 0], [2, 2], [2, 2], [0, 0]])
        result.append(model.predict(xx, steps=1))
    print("done")
    np.save('xTrainProcessed', result)
    xTestProcessed = model.predict(xTestPadded, steps=1)
    np.save('xTestProcessed', xTestProcessed)
else:
    xTrainProcessed = np.load(sys.argv[1])
    xTrainProcessed = np.concatenate(xTrainProcessed, axis=0)
    xTestProcessed = np.load(sys.argv[2])
    inputShape = xTrainProcessed.shape[1:]
    print(inputShape)
    inputLayer = K.layers.Input(shape=inputShape)
    flatten = K.layers.Flatten()(inputLayer)
    dense1 = K.layers.Dense(4096)(flatten)
    relu1 = K.layers.ReLU()(dense1)
    dense2 = K.layers.Dense(4096)(relu1)
    relu2 = K.layers.ReLU()(dense2)
    outputLayer = K.layers.Dense(10, activation='softmax')(relu2)

    #Then create the corresponding model 
    topModel = K.models.Model(inputs=inputLayer, outputs=outputLayer)
    topModel.compile(loss = K.losses.categorical_crossentropy, optimizer = K.optimizers.Adadelta(), metrics = ['accuracy'])
    topModel.fit(xTrainProcessed, yTrain, epochs = epochs, validation_data = (xTestProcessed, yTest))
    vgg16 = K.applications.VGG16(weights='imagenet', include_top=False)
    vgg16.trainable = False
    vgg16.summary()
    inputShape = (32, 32, 3)
    inputLayer = K.layers.Input(shape=inputShape, name='image_input')
    # newvgg16 = vgg16(inputLayer)

    # remove topModel's input
    layers = vgg16.layers[1:] + topModel.layers[1:]
    x = inputLayer
    for i in range(len(layers)):
        x = layers[i](x)
    # top = topModel(newvgg16)
    top = x
    finalModel = K.models.Model(inputs=inputLayer, outputs=top)
    finalModel.compile(loss = K.losses.categorical_crossentropy, optimizer = K.optimizers.Adadelta(), metrics = ['accuracy'])
    filename = 'vgg16-mnist-' + str(epochs) + 'e.h5'
    finalModel.save(filename)
    print('Model saved to ' + filename)
    finalModel.evaluate(xTestPadded, yTest, steps=1)








# flatten = K.layers.Flatten()(newvgg16)
# dense1 = K.layers.Dense(4096)(flatten)
# relu1 = K.layers.ReLU()(dense1)
# dense2 = K.layers.Dense(4096)(relu1)
# relu2 = K.layers.ReLU()(dense2)
# outputLayer = K.layers.Dense(10, activation='softmax')(relu2)

# #Then create the corresponding model 
# vgg16mnist = K.models.Model(inputs=inputLayer, outputs=outputLayer)

# vgg16mnist.compile(loss = K.losses.categorical_crossentropy, optimizer = K.optimizers.Adadelta(), metrics = ['accuracy'])
# vgg16mnist.fit(xTrain, yTrain, 60000, epochs = epochs, validation_data = (xTest, yTest), steps_per_epoch=60000)
# filename = 'vgg16-mnist-' + str(epochs) + 'e.h5'
# vgg16mnist.save(filename)
# print('Model saved to ' + filename)
# vgg16mnist.evaluate(xTest, yTest)

