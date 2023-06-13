import { Graph, VertexGroup } from "./Graph";
import { Item, ItemDictionnary } from "./ItemDictionnary";

export enum FileType {
    Mcl,
    Graph,
    Dico,
    DicoMeaning,
}

class MclFileReader {
    file?: File

    graph: Graph

    constructor() {
        this.file = undefined
        this.graph = new Graph()
    }

    public setFile(f: File) {
        this.file = f
    }

    public async setLocalFile(path: string) {
        let f = await fetch(path).then(b => {
            let res = b.blob()
            console.log(res)
            return res   
        })
        let blobParts = [f]
        this.file = new File(blobParts, 'tmp')
        console.log(this.file)
    }

    // public compute(): Promise<MclData> {
    //     return new Promise((res, rej) => {

    //         if (!this.file) {
    //             console.error("File is not defined : " + this.file)
    //             return
    //         }
            
    //         const fr = new FileReader()
    //         fr.onloadend = (e) => {this.readFile(e, fr); res(new MclData(this.groups, this.fluxes))}
    //         fr.readAsText(this.file!)
            
    //     })
    // }



    public compute(file: File, target: FileType): Promise<void> {
        return new Promise((res, rej) => {
            if (!file) {
                console.error("File is not defined : " + file)
                rej()
            }

            const fr = new FileReader()
            fr.onloadend = (e) => {
                switch (target) {
                    case FileType.Dico:
                        this.readDicoFile(e, fr)
                        res()
                        break
                    case FileType.Graph:
                        this.readGraphFile(e, fr)
                        res()
                        break
                    case FileType.Mcl:
                        this.readMclFile(e, fr)
                        res()
                        break
                    case FileType.DicoMeaning:
                        this.readDicoMeaningFile(e, fr)
                        res()
                        break
                }
            }

            fr.readAsText(file)
        })
    }

    // readFile(e: ProgressEvent, fr: FileReader): void {
    //     let content = fr.result!
    //     let layerIndex = this.layers.length
    //     let lines = (content as string).split('\n')
    //     let result: number[][] = []
    //     let groupIndex = -1
    //     lines.forEach(line => {
    //         if (line === "")
    //             return
    //         ++groupIndex
    //         let g: number[] = []
    //         let items = line.split('\t')
    //         let itemIndex = -1
    //         items.forEach(item => {
    //             ++itemIndex
    //             let n = Number(item)
    //             g[itemIndex] = n
    //             if (n in this.fluxes) {
    //                 this.fluxes[n] = this.fluxes[n].concat([groupIndex])
    //             } else {
    //                 this.fluxes[n] = [groupIndex]
    //             }
    //         })

    //         result[groupIndex] = g
    //     })

    //     this.layers[layerIndex] = result
    //     // console.log(this.groups[0])
    //     // console.log(this.fluxes)
    // }

    readDicoFile(e: ProgressEvent, fr: FileReader): void {
        let content = fr.result!
        let lines = (content as string).split('\n')
        // let DEBcounter = 0
        lines.forEach(line => {
            // if (line === "" || DEBcounter > 100)
            if (line === "")
                return
            // ++DEBcounter
            let items = line.split(',')
            let itemIndex = Number(items[0])
            // history is here
            let itemGT = Number(items[1])
            let itemPred = Number(items[2])
            let item = new Item(itemPred, itemGT)
            ItemDictionnary.addItem(itemIndex, item)
        })
    }

    readMclFile(e: ProgressEvent, fr: FileReader): void {
        let content = fr.result!
        let graphX = -1
        let groupY = 0
        let lines = (content as string).split('\n')
        lines.forEach(line => {
            if (line === ""){
                ++graphX
                groupY = 0
            } else {
                let vg = new VertexGroup(this.graph)
                vg.x = graphX
                vg.y = groupY
                let items = line.split('\t')
                items.forEach(item => {
                    let itemIndex = Number(item)
                    let trueItem = ItemDictionnary.getItemFromIndex(itemIndex)!
                    vg.addItem(trueItem)
                })
                ++groupY
            }
        })
    }

    // MCL FILE : All cluster separated by empty lines (concat of mcl files)

    readGraphFile(e: ProgressEvent, fr: FileReader): void {
        let content = fr.result!
        let lines = (content as string).split('\n')
        lines.forEach(line => {
            if (line.includes(':')) {
                let info = line.split(':')
                let index = Number(info[0])
                let name = info[1]
                this.graph!.setLayerName(index, name)
            }else{
                // let layerIndexes = line.split(',')
                // let a = Number(layerIndexes[0])
                // let b = Number(layerIndexes[1])
                // this.graph!.addLink(a, b)
            }
        })
        this.graph.computeEdges()
    }

    // GRAPH FILE : Only links of layers separated by a , : 
    // 0,1
    // 1,2
    // 2,3 ... for sequential models

    readDicoMeaningFile(e: ProgressEvent, fr: FileReader): void {
        let content = fr.result!
        let lines = (content as string).split('\n')
        lines.forEach(line => {
            if (line.includes(':')) {
                let info = line.split(':')
                let index = Number(info[0])
                let name = info[1]
                ItemDictionnary.addMeaning(index, name)
            }
        })
    }
}

export default MclFileReader 