import { Edge, Vertex } from "./Graph"

export class ItemDictionnary {
    static map: Map<number, Item> = new Map()
    static meaning: Map<number, string> = new Map()
    static gtList: number[] = []
    static gtCounts: Map<number, number> = new Map()

    static addItem(index: number, item: Item) {
        this.map.set(index, item)
        if (!this.gtList.includes(item.gt)) {
            this.gtList.push(item.gt)
            this.gtCounts.set(item.gt, 0)
        }
        this.gtCounts.set(item.gt, this.gtCounts.get(item.gt)! + 1)
    }

    static getItemCountFromGT(gt: number) {
        return this.gtCounts.get(gt)!
    }

    static getItemFromIndex(index: number) {
        return this.map.get(index)!
    }

    static addMeaning(index: number, meaning: string) {
        this.meaning.set(index, meaning)
    }

    static generateMeaningIfEmpty() {
        this.gtList.forEach(gt => {
            console.log("try with " + gt)
            if (!this.meaning.has(Number(gt))) {
                console.log("insert " + gt)
                this.addMeaning(Number(gt), "" + gt)
            }
        })
    }

    static getItemCount() {
        return this.map.size
    }

    static getGTFromMeaning(meaning: string) {
        let l = [...this.meaning.entries()]
        let res = l.find(value => value[1] === meaning)
        return res === undefined ? -1 : res[0]
    }
}

export class Item {
    prediction: number
    gt: number
    edgePresence: Edge[] = []
    vertexPresence: Vertex[] = []

    constructor(prediction:  number, gt: number) {
        this.prediction = prediction
        this.gt = gt
    }

    addEdgePresence(edge: Edge) {
        this.edgePresence.push(edge)
    }

    addVertexPresence(vertex: Vertex) {
        this.vertexPresence.push(vertex)
    }

    isIncorrect() {
        return this.prediction !== this.gt
    }

    isPresent(edge: Edge) {
        return this.edgePresence.some(e => e === edge)
    }
}