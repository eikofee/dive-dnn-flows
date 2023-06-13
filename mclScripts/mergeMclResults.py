import sys

# usage : python mergeMclResults.py <outputFile> <mclResultFiles...>
fileCount = len(sys.argv) - 2
with open(sys.argv[1], 'w') as outputFile:
    outputFile.write('\n')
    for fileIndex in range(fileCount):
        with open(sys.argv[fileIndex + 2], 'r') as stream:
            outputFile.writelines(stream.readlines())
            outputFile.write('\n')