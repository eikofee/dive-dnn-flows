# mclScripts

This folder regroups various scripts to run and perform checks on the `mcl` algorithm/program.

## mcl
See https://micans.org/mcl/.

## mclAll
A Bash script to run the `mcl` program on a batch of files.

### Usage
```
  ./mclAll <dir> <knn>
```
   - `dir`: The path to the folder containing all of the graph files to be run with `mcl`.
   - `knn`: The `n` factor to be used with the KNN pre-pass on the graph.

### Results
All of the files will be written in individual files named `out<original filename>-<knn value>`

## mergeMclResults.py
A Python sript to merge multiple `mcl` outputs into a single file (e.g. to be visualized on PIVERT).

### Usage
```
  python mergeMclResults.py <output filename> <mcl files ...>
```
   - `output filename`: The name of the file produced.
   - `mcl files`: Each mcl file to merge, separated by a whitespace.

### Result
The produced file will contains each orgininal file concatenated to each other with a supplementary linebreak.
This file is ready to be processed by PIVERT (`Mcl file` button).

## checkMcl.py
A Python script to quickly get a glimpse of the result of a `mcl` computation. Displays the content of each found
cluster by doing a sum of each class prediction et GT. It also build "fake" results to display predictions and
gt as they were clustered by the mcl program.

### Usage
```
  python checkMcl.py --dico <dictionary file> --mcl <mcl file> --classCount <n> -o <output file> [--transformDico]
    [--transformPred]
```
   - `--dico <dictionary file>`: The csv file which references each item's GT and prediction.
      The file is formatted as `<item id>,<prediction>, <gt>`.
   - `--mcl <mcl file>`: The mcl-produced file to check/use.
   - `--classCount <n>`: The number of classes contained in the dataset.
   - `-o <output file>`: The name of the produced file (info about cluster composition)
   - `--transformDico`: Also outputs a fake mcl result with each cluster contains all items of a same GT.
   - `--transformPred`: Also outputs a fake mcl result with each cluster contains all items of a same prediction.
