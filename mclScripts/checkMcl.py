from optparse import OptionParser
import numpy as np
import sys

if __name__ == "__main__":
    parser = OptionParser()
    parser.add_option( "--dico", dest="dico", default="dict.csv", help="Dictionary containing prediction and GT for each document")
    parser.add_option( "--mcl", dest="mcl", default="", help="Result of MCL algorithm")
    parser.add_option( "-o", dest="outputPath", default="", help="Destination path")
    parser.add_option( "--classCount", type=int, dest="classCount", default=10, help="Number of classes")
    parser.add_option( "--transformDico", dest="transformDico", default=False, action="store_true")
    parser.add_option( "--transformPred", dest="transformPred", default=False, action="store_true")

    (options, args) = parser.parse_args(sys.argv)
    print("Reading dictionary ...")
    dico = dict()
    with open(options.dico, 'r') as stream:
        for line in stream:
            split = line.split(',')
            index = int(split[0])
            pred = int(split[1])
            gt = int(split[2])
            dico[index] = (pred, gt)
    print("Done.")
    if options.transformDico:
        nbItem = len(dico.keys())
        with open("transformedDico", 'w') as s:
            for x in range(options.classCount):
                sres = []
                for i in range(nbItem):
                    if dico[i][1] == x:
                        sres.append(str(i))
                s.write("\t".join(sres) + "\n")            
        exit()
    if options.transformPred:
        nbItem = len(dico.keys())
        with open("transformedPred", 'w') as s:
            for x in range(options.classCount):
                sres = []
                for i in range(nbItem):
                    if dico[i][0] == x:
                        sres.append(str(i))
                s.write("\t".join(sres) + "\n")            
        exit()
    clusters = []
    print("Reading clustering results ...")
    with open(options.mcl, 'r') as stream:
        for line in stream:
            split = line.replace('\t',' ').split(' ')
            preds = np.zeros(options.classCount)
            gts = np.zeros(options.classCount)
            for s in split:
                preds[dico[int(s)][0]] += 1
                gts[dico[int(s)][1]] += 1
            clusters.append((preds, gts))
    print("Done.")
    print("Writing report ...")
    if options.outputPath == "":
        options.outputPath = "resultCheckMcl" + options.mcl
    np.set_printoptions(suppress=True)
    np.set_printoptions(formatter={'all':lambda x: str(int(x)).ljust(5)})
    with open(options.outputPath, 'w') as s:
        s.write("Cluster count : " + str(len(clusters)) + "\n")
        for i in range(len(clusters)):
            c = clusters[i]
            s.write("Cluster #" + str(i).ljust(9) + str(np.arange(options.classCount)) + "\n")
            s.write("--- Predictions : " + str(c[0]) + "\n")
            s.write("--- GroundTruth : " + str(c[1]) + "\n")
            s.write("-----------------\n")
    print("Done.")
    print("===================================")
    print("Results :")
    with open(options.outputPath, 'r') as s:
        print(s.read())
