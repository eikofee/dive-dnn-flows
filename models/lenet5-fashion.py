# There's only two lines differing from mnist model lul
import tensorflow
import sys
epochs = 1
if len(sys.argv) > 1:
    epochs = int(sys.argv[1])

K = tensorflow.keras

(xTrain, yTrain), (xTest, yTest) = K.datasets.fashion_mnist.load_data()
trainCount = xTrain.shape[0]
testCount = xTest.shape[0]

# format into (count, h, w, channels)
xTrain = xTrain.reshape(trainCount, 28, 28, 1).astype('float32') / 255
xTest = xTest.reshape(testCount, 28, 28, 1).astype('float32') / 255
inputShape = (28, 28, 1)

# format from (7, 1, 4, ...) to [[0, 0, 0, 0, 0, 0, 1, 0, 0, 0], [1, 0, 0, 0, ...], [0, 0, 0, 1, ...], ...]
yTrain = K.utils.to_categorical(yTrain, 10)
yTest = K.utils.to_categorical(yTest, 10)

# model definition

c0 = K.layers.Input(inputShape)
c1 = K.layers.Conv2D(6, kernel_size = (5, 5))(c0)
c2 = K.layers.Activation('tanh')(c1)
c3 = K.layers.AveragePooling2D(pool_size = (2,2))(c2)
c4 = K.layers.Activation('tanh')(c3)
c5 = K.layers.Conv2D(16, kernel_size = (5, 5))(c4)
c6 = K.layers.Activation('tanh')(c5)
c7 = K.layers.Conv2D(120, kernel_size = (5, 5))(c6)
c8 = K.layers.Activation('tanh')(c7)
c9 = K.layers.Flatten()(c8)
c10 = K.layers.Dense(84)(c9)
c11 = K.layers.Activation('tanh')(c10)
c12 = K.layers.Dense(10, activation='softmax')(c11)

model = K.models.Model(inputs = c0, outputs = c12)
model.compile(loss = K.losses.categorical_crossentropy, optimizer = K.optimizers.Adadelta(), metrics = ['accuracy'])

model.fit(xTrain, yTrain, epochs = epochs, validation_data = (xTest, yTest))
filename = 'lenet5-fashion-' + str(epochs) + 'e.h5'
# model.save(filename)
# print('Model saved to ' + filename)
model.evaluate(xTest, yTest)