import GraphDrawer, { MGDrawingProps } from "./GraphDrawer";
import { InteractionType } from "./HoveringManager";
import Popup from "./Popup";

export class MGItem {
    prediction: string
    gt: string
    presence: MGFlux[] = []
    
    constructor(pred: string, gt: string) {
        this.prediction = pred
        this.gt = gt
    }
    
    addFluxPresence(f: MGFlux) {
        this.presence.push(f)
    }
    
    isWrong(): boolean {
        return this.prediction != this.gt
    }
}

export class MGFlux {
    items: MGItem[] = []
    from: MGSet
    to: MGSet
    active: boolean = false

    constructor(from: MGSet, to: MGSet) {
        this.from = from
        this.to = to
        MGItemsMap.addFlux(this)
    }

    addItem(item: MGItem) {
        this.items.push(item)
        item.addFluxPresence(this)
    }

    getSize(props: MGDrawingProps) {
        return Math.max(props.wFluxMinSize, this.items.length * props.wFluxSize)
    }

    draw(context: CanvasRenderingContext2D, props: MGDrawingProps) {
        let yFromItemOffset = this.from.offsetOutputY
        let yToItemOffset = this.to.offsetInputY
        // let it = [ ...this.from.to.keys()]
        // let index = 0
        // for (let item of it) {
            // while (it[index] != this.to) {
                //     // if (item == this.to)
                //         // continue
                //     // yFromItemOffset += item.items.length
                //     yFromItemOffset += it[index].items.length
                //     ++index
                // }
                
                
                // it = [ ...this.to.from.keys()]
                // for (let item of it) {
                    //     if (item == this.from)
                    //         continue
                    //     yToItemOffset += item.items.length
                    // }
                    
        let w = this.getSize(props)
        let fw = this.items.length * props.wFluxSize
        // we're not using w because it may cause undesirable offset on the group
        this.from.offsetOutputY += fw
        this.to.offsetInputY += fw
        context.lineWidth = w
        // let fromX = this.from.drawX + props.wGroupSpace - props.wGroupBorder
        let fromX = this.from.drawX + props.wSetSize
        let fromY = this.from.drawY + yFromItemOffset + fw / 2

        let toX = this.to.drawX
        let toY = this.to.drawY + yToItemOffset + fw / 2

        context.beginPath()
        if (MGGraph.isUnsingActiveSets() && !this.active) {
            context.strokeStyle = props.getColorInactive(MGItemsMap.gtList.findIndex(s => s === this.items[0].gt));
        } else {
            context.strokeStyle = props.getColorAlpha(MGItemsMap.gtList.findIndex(s => s === this.items[0].gt));
        }
        context.moveTo(fromX, fromY)
        context.bezierCurveTo((fromX + toX) / 2, fromY, (fromX + toX) / 2, toY, toX, toY)
        context.stroke()
    }
}

export class MGSet {
    drawX: number = 0
    drawY: number = 0
    drawW: number = 0
    drawH: number = 0
    offsetInputY: number = 0
    offsetOutputY: number = 0
    items: MGItem[] = []
    to: Map<MGSet, MGFlux> = new Map()
    from: Map<MGSet, MGFlux> = new Map()
    active: boolean = false
    group: MGGroup;
    orderY: number = -1;
    gt: string = "";
    localInfo: JSX.Element | undefined = undefined

    constructor(g: MGGroup) {
        MGItemsMap.addSet(this)
        this.group = g
    }

    addItem(i: MGItem) {
        this.items[this.items.length] = i
        // this.group.addItem(i)
    }

    count() {
        return this.items.length
    }

    getSize(props: MGDrawingProps) {
        // let size = 0
        // let fluxes = [...this.from.values()]
        // fluxes.forEach(f => size += f.getSize(props))
        // return size
        return Math.max(props.hSetMinSize, this.count() * props.hSetSize)
    }

    drawFluxes(context: CanvasRenderingContext2D, props: MGDrawingProps) {
        let s = [ ...this.to.keys()]
        s.sort((a, b) => {
        if (a.group == b.group)
            return a.orderY - b.orderY
        else
            return a.group.orderY - b.group.orderY
        })
        s.forEach(k => this.to.get(k)!.draw(context, props))
    }

    computeOrder() {
        let deg = 0;
        let sum = 0;
        MGItemsMap.fluxList.forEach(f => {
            let w = f.items.length
            if (f.from == this) {
                deg += w
                let cSum = 0
                for (let i = 0; i < f.to.group.orderY; ++i) {
                    cSum += f.to.group.layer.groups[i].items.length
                }
                for (let i = 0; i < f.to.orderY; ++i) {
                    cSum += f.to.group.getSets()[i].items.length
                }
                sum += w * cSum
            }
            if (f.to == this) {
                deg += w
                let cSum = 0
                for (let i = 0; i < f.from.group.orderY; ++i) {
                    cSum += f.from.group.layer.groups[i].items.length
                }
                for (let i = 0; i < f.from.orderY; ++i) {
                    cSum += f.from.group.getSets()[i].items.length
                }
                sum += w * cSum
            }
        })
        this.orderY = sum / deg
    }

}

export class MGGroup {
    drawX: number = -1
    drawY: number = -1
    orderY: number = -1
    items: MGItem[] = []
    private drawHeightSize: number = -1
    layer: MGLayer;
    private sets: MGSet[] = [];
    setCount: number = 0
    localInfos: JSX.Element[] = []
    private keyCounter = 0;

    constructor(l: MGLayer) {
        this.layer = l;
    }

    getSize() {
        return this.items.length
    }

    addItem(item: MGItem) {
        this.items.push(item)
    }

    computeOrder() {
        let deg = 0
        let sum = 0
        // MGItemsMap.gtList.forEach(gt => {
        //     let set = this.sets![gt]
        //     if (set != undefined) {
        //         set.to.forEach((k, v) => {
        //             deg += k.items.length
        //             sum += k.items.length * k.to.group.orderY
        //         })
        //     }
        // })
        // this.orderY = sum / deg;
        // console.log(this.orderY)
        MGItemsMap.fluxList.forEach(f => {
            if (f.to.group == this) {
                let w = f.items.length
                deg += w
                let cSum = 0
                for (let i = 0; i < f.from.group.orderY; ++i)
                    cSum += f.from.group.layer.groups[i].items.length
                sum += cSum * w
            }
            if (f.from.group == this) {
                let w = f.items.length
                deg += w
                let cSum = 0
                for (let i = 0; i < f.to.group.orderY; ++i) {
                    cSum += f.to.group.layer.groups[i].items.length
                }
                sum += cSum * w
            }
        })

        this.orderY = sum / deg;

    }

    resortSets() {
        this.sets.forEach(s => s.computeOrder())
        this.sets.sort((a, b) => a.orderY - b.orderY)
        for (let i = 0; i < this.sets.length; ++i) {
            this.sets[i].orderY = i;
        }
    }

    draw(context: CanvasRenderingContext2D, props: MGDrawingProps, x: number, groupYOffset: number) {
        this.drawX = x
        this.drawY = groupYOffset
        
        context.fillStyle = props.groupBorderColor
        // let outlineHeight = this.getSize() + props.wGroupBorder * 2
        let contentSize = 0
        this.sets.forEach(s => contentSize += s.getSize(props))
        let outlineHeight = Math.max(props.hGroupMinSize, contentSize) + props.hGroupBorder * 2
        let outlineWidth =(props.wGroupSpace + props.wGroupBorder)
        this.drawHeightSize = outlineHeight
        context.fillRect(x, groupYOffset, outlineWidth, outlineHeight)
        
        context.fillStyle = "white"
        let inlineX = x + props.wGroupBorderIn
        let inlineY = groupYOffset + props.hGroupBorderIn
        let inlineWidth =(props.wGroupSpace + props.wGroupBorder - 2 * props.wGroupBorderIn)
        let inlineHeight = outlineHeight - 2 * props.hGroupBorderIn
        context.fillRect(inlineX, inlineY, inlineWidth, inlineHeight)
        
        let sets = this.getSets()
        GraphDrawer.hm.drawInteractiveRect(InteractionType.Hover, x, groupYOffset, props.wGroupSpace + props.wGroupBorder, outlineHeight)
        GraphDrawer.hm.addInteraction(InteractionType.Hover, (x, y, popup) => {
            // popup.clearInfo()
            popup.setHeader(this.getSize(), MGItemsMap.itemList.length)
            // sets.forEach(set => {                
                // let className = set.gt
                // let colorTik = props.getColor(MGItemsMap.gtList.findIndex(k => k === className))
                // let itemCount = set.count()
                // let partLocal = (itemCount / this.getSize() * 100).toString().substr(0, 5) + '%'
                // let partTotal = (itemCount / MGItemsMap.getGtCount(className) * 100).toString().substr(0, 5) + '%'
                // popup.addInfo(colorTik, className, '' + itemCount, partLocal, partTotal)
            // })
            popup.setInfos(this.localInfos)
            popup.setPos(x, y)
        })

        GraphDrawer.hm.drawInteractiveRect(InteractionType.Click,x, groupYOffset, props.wGroupSpace + props.wGroupBorder, outlineHeight)
        GraphDrawer.hm.addInteraction(InteractionType.Click, () => {
                MGGraph.useActiveSets()

            let onlyTrue = (this.sets.some(s => s.active) && this.sets.some(s => !s.active))
            this.sets.forEach(set => {
                MGItemsMap.toggleSet(set, onlyTrue)
            })
 
            // GraphDrawer.currentGraphDrawer.drawGraph(GraphDrawer.currentGraph)
        })
        
        
        this.drawSets(context, props, groupYOffset)
    }

    drawSets(context: CanvasRenderingContext2D, props: MGDrawingProps, groupYOffset: number) {
        let yOffset = props.hGroupBorder + groupYOffset
        this.localInfos = []
        let sets = this.getSets()
        sets.forEach(set => {
            let gt = set.gt
            let colorIndex = MGItemsMap.gtList.findIndex(k => k === gt)
            let color = props.getColor(colorIndex)
            let partLocal = (set.items.length / this.getSize() * 100).toString().substr(0, 5) + '%'
            let partTotal = (set.items.length / MGItemsMap.getGtCount(gt) * 100).toString().substr(0, 5) + '%'

            let info = Popup.buildInfo('' + this.drawX + '' + this.drawY + '' + this.keyCounter, color, MGItemsMap.getMeaning(gt), '' + set.items.length, partLocal, partTotal)
            set.localInfo = info
            this.keyCounter += 1
            this.localInfos[this.localInfos.length] = info
            if (MGGraph.isUnsingActiveSets() && !set.active)
                // color = props.getColorInactive(colorIndex)
                color = props.getColorAlpha(colorIndex)
            // let size = Math.max(props.hSetMinSize, set.count() * props.hSetSize)
            let size = set.getSize(props)
            context.fillStyle = color
            // set.drawX = this.drawX + props.wGroupBorder
            set.drawW = props.wSetSize
            set.drawH = size
            if (MGGraph.isShowingErrors()) {
                // set.drawW /= 2
            }
            set.drawX = this.drawX + props.wGroupSpace / 2
            set.drawY = yOffset
            set.offsetInputY = 0
            set.offsetOutputY = 0
            // context.fillRect(set.drawX, set.drawY, props.wGroupSpace - props.wGroupBorder, size)
            // context.fillRect(set.drawX, set.drawY, props.wSetSize, size)
            context.fillRect(set.drawX, set.drawY, set.drawW, size)
            if (MGGraph.isShowingErrors()) {
                context.fillStyle = props.getColorError(colorIndex)
                let errorSize = set.items.filter(i => i.isWrong()).length * props.hItemSize;
                context.fillRect(set.drawX + set.drawW / 2, set.drawY + set.drawH - errorSize, set.drawW / 2, errorSize)
            }
            // GraphDrawer.hm.drawInteractiveRect(InteractionType.Click, set.drawX, set.drawY, props.wGroupSpace - props.wGroupBorder, size)
            GraphDrawer.hm.drawInteractiveRect(InteractionType.Click, set.drawX, set.drawY, props.wSetSize, size)
            GraphDrawer.hm.addInteraction(InteractionType.Click, (x, y, pu) => {
                MGGraph.useActiveSets()
                MGItemsMap.toggleSet(set)
                // GraphDrawer.currentGraphDrawer.drawGraph(GraphDrawer.currentGraph)
            })

            yOffset += size
        })
    }

    drawFluxes(context: CanvasRenderingContext2D, props: MGDrawingProps) {
        let s = this.getSets()
        for (let ss in s) {
            let set = s[ss]
            set.drawFluxes(context, props)
        }
    }

    getSets() {

        if (this.sets.length == 0) {
            this.items.forEach(i => {
                let e = this.sets.find(s => s.gt == i.gt)
                if (e!) {
                    e!.addItem(i)
                } else {
                    let e = this.addSet()
                    e.gt = i.gt
                    e.addItem(i)
                }
            })
        }

        return this.sets
    }

    addSet() {
        let s = new MGSet(this)
        s.orderY = this.setCount
        this.sets[this.setCount] = s
        this.setCount += 1
        return s;
    }

    getDrawYSize(props: MGDrawingProps) {
        // if (this.drawHeightSize === -1) {
            // console.error("Group " + this + " is not drawn yet")
        // } 

        // return this.drawHeightSize
        if (this.drawHeightSize === -1) {
            this.drawHeightSize = Math.max(props.hGroupMinSize, this.items.length * props.hGroupSize) + props.hGroupBorder * 2
        } 

        return this.drawHeightSize
    }
}

export class MGLayer {
    graph: MGGraph
    groups: MGGroup[] = []
    name: string = ""
    from: MGLayer[] = []
    to: MGLayer[] = []

    constructor(g: MGGraph) {
        this.graph = g
    }

    isEmpty() {
        return this.groups.length === 0
    }

    addNewGroup() {
        let g = new MGGroup(this)
        // this.groups.push(g)
        g.orderY = this.groups.length
        this.groups[this.groups.length] = g
        return g
    }

    resortGroups() {
        this.groups.forEach(g => {
            g.computeOrder()
        })
        this.groups.sort((a, b) => a.orderY - b.orderY)
        for (let i = 0; i < this.groups.length; ++i) {
            let g = this.groups[i]
            g.orderY = i
        }
        this.groups.forEach(g => g.resortSets());
    }

    computeFluxes() {
        this.to.forEach(targetLayer => {
            this.groups.forEach(groupFrom => {
                let sets = groupFrom.getSets()
                for (let s in sets) {
                    let setFrom = groupFrom.getSets()[s]
                    setFrom.items.forEach(i => {
                        let groupTo = targetLayer.groups.find(h => h.items.includes(i))
                        if (!groupTo){
                            console.log(targetLayer)
                            console.log(i)
                        }
                        let setsTo = groupTo!.getSets()
                        // let setTo = setsTo[i.gt]
                        let setTo = setsTo.find(k => k.gt == i.gt)
                        if (setTo == undefined) {
                            setTo = groupTo!.addSet()
                        }
                        if (setFrom.to.has(setTo)) {
                            setFrom.to.get(setTo)!.addItem(i)
                        } else {
                            let f = new MGFlux(setFrom, setTo)
                            setFrom.to.set(setTo, f)
                            setTo.from.set(setFrom, f)
                            f.addItem(i)
                        }
                    })
                }
            })
        })
    }

    getXCoord(): number {
        if (this.from.length > 0) {
            return 1 + this.from[0].getXCoord()
        } else {
            return 0
        }
    }

    getYCoord(): number {
        if (this.from.length > 0) {
            let yy = this.from[0].to.findIndex(l => l === this)!
            return yy + this.from[0].getYCoord()
        } else {
            return 0
        }
    }

    draw(context: CanvasRenderingContext2D, props: MGDrawingProps) {
        context.fillStyle = props.textColor
        let wLayerSpacing =  props.wViewSize / (Math.min(this.graph.layers.length, props.nLayerCountMax) - 1)
        let x = props.xLayerOffset + wLayerSpacing * this.getXCoord()
        let y = props.yLayerOffset + props.hLayerSpace * this.getYCoord()
        context.fillText(this.name, x, y - props.yTextOffsetUp)
        let groupYOffset = y
        let groupSizes = 0
        this.groups.forEach(g => groupSizes += g.getDrawYSize(props))
        let groupSpacing = (props.hLayerSize - groupSizes) / (this.groups.length - 1)
        this.groups = this.groups.sort((a, b) => a.orderY - b.orderY)
        this.groups.forEach(g => {
            g.draw(context, props, x, groupYOffset)
            groupYOffset += g.getDrawYSize(props) + groupSpacing
        })
        
    }
    
    drawFluxes(context: CanvasRenderingContext2D, props: MGDrawingProps) {
        this.groups.forEach(g => g.drawFluxes(context, props))
    }
}

export class MGGraph {
    layers: MGLayer[] = []
    resorted: boolean = false
    private static usingActiveSets: boolean = false
    private static showingErrors: boolean = false

    static isUnsingActiveSets() {
        return MGGraph.usingActiveSets
    }

    static isShowingErrors(){
        return this.showingErrors
    }

    static toggleShowingError(value: boolean|undefined = undefined) {
        if (value) {
            this.showingErrors = value!
        } else {
            this.showingErrors = !this.showingErrors
        }
    }

    static useActiveSets(value:boolean = true) {
        if (!value)
            MGGraph.usingActiveSets = value
        else if (!MGGraph.usingActiveSets) {
            MGGraph.resetActive()
            MGGraph.usingActiveSets = value
        }
    }

    addNewLayer() {
        let l = new MGLayer(this)
        // this.layers.push(l)
        this.layers[this.layers.length] = l
        return l
    }

    purgeEmptyLayers() {
        let newLayers: MGLayer[] = []
        this.layers.forEach(l => {
            if (!l.isEmpty()) {
                // newLayers.push(l)
                newLayers[newLayers.length] = l
            }
        })
        this.layers = newLayers
    }

    addLink(layerIndexFrom: number, layerIndexTo: number) {
        let la = this.layers[layerIndexFrom]
        let lb = this.layers[layerIndexTo]
        la.to[la.to.length] = lb
        lb.from[lb.from.length] = la
        
    }

    draw(context: CanvasRenderingContext2D, props: MGDrawingProps) {
        if (!this.resorted){
            this.resorted = true
            for (let i = 0; i < props.resortIter; ++i) {
                if (i % 2 == 0) {
                    for (let ii = 0; ii < this.layers.length; ++ii) {
                        this.layers[ii].resortGroups();
                    }
                } else {
                    for (let ii = this.layers.length - 1; ii >= 0; --ii) {
                        this.layers[ii].resortGroups();
                    }
                }
            }
        }
        this.layers.forEach(layer => {
            layer.draw(context, props)
        })
    }

    drawLegend(context: CanvasRenderingContext2D, props: MGDrawingProps) {
        for (let i = 0; i < MGItemsMap.gtList.length; ++i) {
            let x = props.xLegendStart + Math.floor(i / props.nLegendCountPerColumn) * props.wLegendLabel
            let y = props.hViewSize + (props.nLegendCountPerColumn - i % props.nLegendCountPerColumn) * props.hLegendLabel
            let w = props.wLegendRect
            let h = props.hLegendRect
            context.fillStyle = props.getColor(i)
            context.fillRect(x, y, w, h)
            context.fillStyle = props.textColor
            context.fillText(MGItemsMap.getMeaning(MGItemsMap.gtList[i]), x + w + props.wLegendSpacing, y + props.yLegendTextOffset)
            GraphDrawer.hm.drawInteractiveRect(InteractionType.Click, x, y, w, h)
            GraphDrawer.hm.addInteraction(InteractionType.Click, () => {
                MGGraph.useActiveSets()
                MGItemsMap.setList.filter(s => s.items[0].gt === MGItemsMap.gtList[i])!.forEach(s => MGItemsMap.toggleSet(s, true))
                // GraphDrawer.currentGraphDrawer.drawGraph(GraphDrawer.currentGraph)
            })
        }
    }

    drawFluxes(context: CanvasRenderingContext2D, props: MGDrawingProps) {
        this.layers.forEach(l => l.drawFluxes(context, props))
    }

    static resetActive() {
        MGItemsMap.setList.forEach(s => s.active = false)
        MGItemsMap.fluxList.forEach(s => s.active = false)
    }
}

export class MGItemsMap {

    static dico: { [index: number]: MGItem } = {}
    static meaning: { [index: string]: string } = {}
    static fluxes: Map<[MGGroup, MGGroup], MGFlux> = new Map()
    static gtList: string[] = []
    static gtCounts: { [index: string]: number} = {}
    static setList: MGSet[] = []
    static fluxList: MGFlux[] = []
    static itemList: MGItem[] = []
    static gtComputed: boolean = false
    static itemCount: number = 0

    static getItemFromIndex(index: number) {
        if (index in MGItemsMap.dico) {
            return MGItemsMap.dico[index];
        } else {
            console.error("Index " + index + " not in dico")
        }
    }

    static computeGtCount() {
        this.gtComputed = true
        this.itemList.forEach(i => {
            if (!(i.gt in this.gtCounts)) {
                this.gtCounts[i.gt] = 0
            }

            this.gtCounts[i.gt] += 1
        })
    }

    static getGtCount(gt: string) {
        if (!this.gtComputed) {
            this.computeGtCount()
        }

        return this.gtCounts[gt]
    }

    static addSet(set: MGSet) {
        this.setList[this.setList.length] = set
    }

    static addFlux(flux: MGFlux) {
        this.fluxList[this.fluxList.length] = flux
    }

    static addItem(index: number, item: MGItem) {
        if (index in MGItemsMap.dico) {
            console.error("Index " + index + " already in use for item " + MGItemsMap.dico[index])
            console.warn(MGItemsMap.dico[index])
        } else {
            MGItemsMap.dico[index] = item
            this.itemCount += 1
            if (!MGItemsMap.gtList.includes(item.gt)) {
                MGItemsMap.gtList.push(item.gt)
            }
            this.itemList[this.itemList.length] = item
        }
    }

    static addMeaning(index: number, label: string) {
        this.meaning[index] = label
    }

    static getMeaning(index: string) {
        if (index in this.meaning)
            return this.meaning[index]
        return '' + index            
    }

    static getItemCount() {
        return this.itemCount;
    }

    static toggleSet(set: MGSet, onlySetTrue: boolean = false) {
        let items = set.items
        let newState = !set.active
        if (onlySetTrue)
            newState = true
        // this.setList.forEach(s => {
        //     if (s.items.some(ss => items.includes(ss))) {
        //         s.active = newState
        //     }
        // })
        // this.fluxList.forEach(s => {
            // if (s.items.some(ss => items.includes(ss))) {
                // s.active = newState
                // s.from.active = newState
                // s.to.active = newState
            // }
        // })
        items.forEach(i => i.presence.forEach(f => {
            f.active = newState
            f.from.active = newState
            f.to.active = newState
        }))
    }   
}


