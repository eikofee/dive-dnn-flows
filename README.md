# P I V E R T 
This repo groups all of the pipeline tools and scripts to display the categorization flow of a
trained neural network.
Using pyspark.

# Pipeline

The pipeline is working as it follows :

Trained neural network + testing dataset (e.g. LeNet trained on MNIST as .h5 file + testing dataset from keras)

:arrow_down:

`modelToActivations.py`

:arrow_down:

Formatted file with distances between all documents at each layer (with or without LRP post-processing) 

:arrow_down:

`mcl` program (https://micans.org/mcl/)

:arrow_down:

Visualization tool

# Repo organization

**root** : Main pipeline files, this file, and other important stuff

**examples** : Example files using `modelToActivations.py` on different datasets

**models** : Files to build, train and export various models

**viz** : React project to start the visualization tool, more info on its usage inside and demo available at https://pivert.labri.fr/flows/index.html.

# File generation

**modelToActivations.py**

| File name | Description | Optional |
|-----------|-------------|----------|
|activations.seq|contains each layer result for every input data|:heavy_check_mark:|
|distancesLayer*X*|contains the formated distance "matrix" for layer *X*| |

# Datasets

**MNIST** : `tensorflow.keras.datasets.mnist.load_data()` or from https://storage.googleapis.com/tensorflow/tf-keras-datasets/mnist.npz (to load with `numpy.load(mnist.npz)`, gives a dictionary with 'x/y_train/test' as keys)

# Visualization

First run needs dependencies to be installed:
```
npm install react react-dom react-scripts
```
then to start the thing : `npm start`
