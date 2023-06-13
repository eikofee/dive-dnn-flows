import { DrawingProperties } from "./DrawingProperies"
import { Item, ItemDictionnary } from "./ItemDictionnary"
import GraphDrawer from "./GraphDrawer"
import { InteractionType } from "./HoveringManager"
import Popup from "./Popup"

export class Graph {
    vertexes: Vertex[] = []
    vertexGroups: VertexGroup[] = []
    edges: Edge[] = []
    private layerCount: number = -1
    vertexCount: number = 0
    edgeCount: number = 0
    vertexGroupCount: number = 0
    useActivations: boolean = false
    layerNames: Map<number, string> = new Map()
    
    addVertex(v: Vertex) {
        this.vertexes.push(v)
        ++this.vertexCount
    }
    
    addEdge(e: Edge) {
        this.edges.push(e)
        ++this.edgeCount
    }
    
    setActivation(set : boolean = true) {
        if (!set) {
            this.useActivations = set
        } else if (!this.useActivations) {
            this.resetActivations()
            this.useActivations = set
        }
    }
    
    resetActivations() {
        this.vertexes.forEach(v => v.active = false)
        this.edges.forEach(e => e.active = false)
    }
    
    addVertexGroup(vg: VertexGroup) {
        this.vertexGroups.push(vg)
        ++this.vertexGroupCount
    }
    
    getVertexesOfLayer(x: number) {
        return this.vertexes.filter(v => v.x === x)
    }
    
    getVertexGroupsOfLayer(x: number) {
        return this.vertexGroups.filter(vg => vg.x === x)
    }
    
    getLayerCount(recount: boolean = false) {
        if (!recount && this.layerCount !== -1) {
            return this.layerCount
        }
        
        let result = 0
        this.vertexGroups.forEach(vg => {
            if (vg.x > result) {
                result = vg.x
            }
        })
        
        this.layerCount = result + 1
        return this.layerCount
    }
    
    avoidEdgeCrossing(iter: number) {
        for (let i = 0; i < iter; ++i) {
            let from = 0
            let to = this.getLayerCount()
            let incr = 1
            if (i % 2 === 1) {
                from = to
                to = 0
                incr = -1
            }
            
            for (let layer = from; layer !== to; layer += incr) {
                let vertexGroups = this.getVertexGroupsOfLayer(layer)
                vertexGroups.forEach(vg => {
                    let newY = 0
                    let factor = 0
                    vg.edgesFrom.forEach(e => {
                        // newY += e.to.vertexGroup.y
                        newY += e.to.vertexGroup.y * e.weight
                        // factor += 1
                        factor += e.weight
                    })
                    vg.edgesTo.forEach(e => {
                        // newY += e.from.vertexGroup.y
                        newY += e.from.vertexGroup.y * e.weight
                        // factor += 1
                        factor += e.weight
                    })
                    if (factor !== 0) {
                        vg.y = newY / factor
                        vg.avoidEdgeCrossing()
                    }
                })
                
                this.reorderSubVertexGroups(vertexGroups)
            }
            this.reorderVertexGroups()
        }
    }
    
    reorderSubVertexGroups(vertexGroups: VertexGroup[]) {
        let orderedVertexGroup = vertexGroups.sort((a, b) => a.y - b.y)
        let y = 0
        orderedVertexGroup.forEach(vg => {
            vg.y = y
            ++y
        })
    }
    
    
    reorderVertexGroups() {
        let orderedVertexGroup = this.vertexGroups.sort((a, b) => a.y - b.y)
        this.vertexGroups = orderedVertexGroup
    }
    
    draw(context: CanvasRenderingContext2D, props: DrawingProperties) {
        for (let layer = 0; layer < this.layerCount; ++layer) {
            let y = props.yLayerOffset
            context.fillStyle = "black"
            context.font = props.sTextSize + "px Arial"
            context.fillText(this.layerNames.get(layer)!, props.getXfromLayer(layer), props.yLayerOffset - props.yTextOffsetUp)
            let vertexGroups = this.getVertexGroupsOfLayer(layer)
            vertexGroups.forEach(vg => {
                y = vg.draw(context, props, y)
            })
        }
        
        this.vertexes.forEach(v => v.drawEdges(context, props))
        this.vertexes.forEach(v => v.yEdgeFrom = 0)
        
    }
    
    computeEdges() {
        for (let layer = 0; layer < this.getLayerCount() - 1; ++layer) {
            let currentLayer = layer
            let nextLayer = layer + 1
            let currentVertexes = this.getVertexesOfLayer(currentLayer)
            let nextVertexes = this.getVertexesOfLayer(nextLayer)
            currentVertexes.forEach(currentVertex => {
                let edgeMap: Map<Vertex, Edge> = new Map()
                currentVertex.items.forEach(item => {
                    let destination = nextVertexes.find(v => v.items.some(i => i === item))!
                    if (edgeMap.has(destination)) {
                        let edge = edgeMap.get(destination)!
                        edge.weight += 1
                        item.addEdgePresence(edge)
                    } else {
                        let edge = new Edge(currentVertex, destination)
                        edge.weight = 1
                        edgeMap.set(destination, edge)
                        currentVertex.addEdge(edge)
                        item.addEdgePresence(edge)
                    }
                })
                
            })
        }
    }
    
    
    setLayerName(layer: number, name: string) {
        this.layerNames.set(layer, name)
    }

    drawLegend(c: CanvasRenderingContext2D, props: DrawingProperties) {
        ItemDictionnary.generateMeaningIfEmpty()
        let gts = Array.from(ItemDictionnary.meaning.entries()).sort((a, b) => a[1] > b[1] ? 1 : -1)
        let xstep = props.wView / props.nLegendItemCountOnWidth
        let ystep = props.hLegendRect
        let x = 0
        let y = props.hView - props.hLegendSpace
        gts.forEach(v => {
            let color = props.getVertexColorFromGt(v[0], false)
            let label = v[1]
            c.fillStyle = color
            c.fillRect(x, y, props.wLegendRect, props.hLegendRect)
            c.fillText(label, x + props.wLegendRect + props.xLegendRectLabelOffset, y + props.sTextSize)
            GraphDrawer.hm.drawInteractiveRect(InteractionType.Click, x, y,props.wLegendRect, props.hLegendRect)
            GraphDrawer.hm.addInteraction(InteractionType.Click, () => {
                this.useActivations = true
                let vs = this.vertexes.filter(s => s.items[0].gt === v[0])!
                // let vs = this.vertexes.filter(s => s.items[0].gt === v[0])!
                // vs.forEach(s => this.toggleSet(s, true))
                vs.forEach(s => s.active = true)
                this.edges.filter(e => e.gt === v[0])!.forEach(e => e.active = true)
                GraphDrawer.currentGraphDrawer.drawGraph(GraphDrawer.currentGraph)
            })
            x += xstep
            if (x >= props.wView) {
                x = 0
                y += ystep
            }
        })
    }
    toggleSet(vertex: Vertex, onlySetTrue: boolean = false) {
        // let items = vertex.items
        let newState = !vertex.active
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
        vertex.active = newState
        // items.forEach(i => i.presence.forEach(f => {
        //     f.active = newState
        //     f.from.active = newState
        //     f.to.active = newState
        // }))
    }   
    
}

export class Vertex {
    x: number = 0
    superY: number = 0
    subY: number = 0
    edgesFrom: Edge[] = []
    edgesTo: Edge[] = []
    items: Item[] = []
    itemCount: number = 0
    graph: Graph
    gt: number = -1
    vertexGroup: VertexGroup
    xDraw: number = 0
    yDraw: number = 0
    yEdgeFrom: number = 0
    active: boolean = false
    
    constructor(vertexGroup: VertexGroup) {
        this.vertexGroup = vertexGroup
        this.graph = vertexGroup.graph
        this.graph.addVertex(this)
    }
    
    addEdge(edge: Edge) {
        if (edge.from === this) {
            this.edgesFrom.push(edge)
            edge.to.edgesTo.push(edge)
            this.vertexGroup.edgesFrom.push(edge)
            edge.to.vertexGroup.edgesTo.push(edge)
        } else if (edge.to === this) {
            this.edgesTo.push(edge)
            edge.from.edgesFrom.push(edge)
            this.vertexGroup.edgesTo.push(edge)
            edge.from.vertexGroup.edgesFrom.push(edge)
        } else {
            console.error("Assigned edge to vertex isn't linked to it")
            console.error(edge)
            console.error(this)
        }

    }

    computedY() {
        return this.vertexGroup.y + this.subY / (this.vertexGroup.vertexCount + 1)
    }

    addItem(item: Item) {
        this.items.push(item)
        ++this.itemCount
    }

    draw(context: CanvasRenderingContext2D, props: DrawingProperties, yDraw: number) {
        let isInactive = (this.graph.useActivations && !this.active)
        context.fillStyle = props.getVertexColorFromGt(this.gt, isInactive)
        let xDraw = props.getXfromLayer(this.x)
        let wDraw = props.wVertex
        let hDraw = this.itemCount * props.hVertexItem
        context.fillRect(xDraw, yDraw, wDraw, hDraw)
        GraphDrawer.hm.drawInteractiveRect(InteractionType.Click, xDraw, yDraw, wDraw, hDraw)
        GraphDrawer.hm.addInteraction(InteractionType.Click, (x, y, pu) => {
            this.graph.useActivations = true
            this.active = true
            this.items.forEach(i => i.edgePresence.forEach(e => e.active = true))
            this.items.forEach(i => i.vertexPresence.forEach(v => v.active = true))
            GraphDrawer.currentGraphDrawer.drawGraph(GraphDrawer.currentGraph)
        })
        this.xDraw = xDraw
        this.yDraw = yDraw
        return yDraw + hDraw
    }

    sortEdges() {
        this.edgesFrom.sort((a, b) => a.to.computedY() - b.to.computedY())
        this.edgesTo.sort((a, b) => a.from.computedY() - b.from.computedY())
    }

    drawEdges(context: CanvasRenderingContext2D, props: DrawingProperties) {
        let y = this.yDraw
        this.edgesFrom.sort((a, b) => a.to.yDraw - b.to.yDraw).forEach(e => {
            y = e.draw(context, props, y)
        })
    }

    getEdgeYfrom(e: Edge) {
        let sorted = this.edgesTo.sort((a, b) => a.from.vertexGroup.y - b.from.vertexGroup.y)
        let index = sorted.findIndex(ee => e === ee)
        let res = 0
        for (let i = 0; i < index; ++i) {
            res += sorted[i].weight
        }

        return res
    }

}

// alias clusters, each vertex will be only one item class
export class VertexGroup {
    x: number = 0
    y: number = 0
    vertexes: Vertex[] = []
    vertexCount: number = 0
    graph: Graph
    edgesFrom: Edge[] = []
    edgesTo: Edge[] = []
    gtToVertex: { [gt: number]: Vertex } = {}
    items: Item[] = []
    itemCount: number = 0
    localInfos: JSX.Element[] = []

    constructor(graph: Graph) {
        this.graph = graph
        this.graph.addVertexGroup(this)
    }

    addVertex() {
        let v = new Vertex(this)
        v.x = this.x
        v.superY = this.y
        v.subY = this.vertexCount
        this.vertexCount = this.vertexes.push(v)
        return v
    }

    addItem(item: Item) {
        let gt = Number(item.gt)
        if (gt in this.gtToVertex) {
            let v = this.gtToVertex[gt]
            v.addItem(item)
            item.addVertexPresence(v)
        } else {
            let v = this.addVertex()
            v.addItem(item)
            item.addVertexPresence(v)
            v.gt = gt
            this.gtToVertex[gt] = v
        }

        this.items.push(item)
        ++this.itemCount
    }

    avoidEdgeCrossing() {
        this.vertexes.forEach(v => {
            let newY = 0
            let factor = 0
            v.edgesFrom.forEach(e => {
                newY += e.to.computedY()
                factor += 1
            })
            v.edgesTo.forEach(e => {
                newY += e.from.computedY() 
                factor += 1
            })
            if (factor !== 0) {
                v.subY = newY / factor
            }

            v.sortEdges()
        })
        this.reorderVertexes()
    }

    reorderVertexes() {
        let orderedVertexes = this.vertexes.sort((a, b) => a.subY - b.subY)
        let y = 0
        orderedVertexes.forEach(v => {
            v.subY = y
            ++y
        })
    }

    draw(context: CanvasRenderingContext2D, props: DrawingProperties, yDraw: number) {
        context.fillStyle = props.colorGroup
        let xDraw = props.getXfromLayer(this.x) - props.wBorderLine - props.wBorderSpace
        let wDraw = props.wBorderLine * 2 + props.wBorderSpace * 2 + props.wVertex
        // yDraw -= props.wBorderLine + props.wBorderSpace
        let hDraw = this.itemCount * props.hVertexItem + props.wBorderLine * 2 + props.wBorderSpace * 2
        context.fillRect(xDraw, yDraw, wDraw, hDraw)
        GraphDrawer.hm.drawInteractiveRect(InteractionType.Hover, xDraw, yDraw, wDraw, hDraw)
        GraphDrawer.hm.addInteraction(InteractionType.Hover, (x, y, pu) => {
            pu.setHeader(this.itemCount, ItemDictionnary.getItemCount())
            this.getLocalInfos(props)
            pu.setInfos(this.localInfos)
            pu.setPos(x, y)
        })
        context.fillStyle = props.colorBackground
        let xDrawInner = props.getXfromLayer(this.x) - props.wBorderSpace
        let yDrawInner = yDraw + props.wBorderLine
        let wDrawInner = props.wBorderSpace * 2 + props.wVertex
        let hDrawInner = this.itemCount * props.hVertexItem + props.wBorderSpace * 2
        context.fillRect(xDrawInner, yDrawInner, wDrawInner, hDrawInner)
        let yVertex = yDraw + props.wBorderSpace + props.wBorderLine
        this.vertexes.forEach(v => {
            yVertex = v.draw(context, props, yVertex)
        })
        
        return yDraw + hDraw + props.hGroupSpacing[this.x]
    }

    getHdrawSize(props: DrawingProperties) {
        let hDraw = this.itemCount * props.hVertexItem + props.wBorderLine * 2 + props.wBorderSpace * 2
        return hDraw
    }

    getLocalInfos(props: DrawingProperties) {
        if (this.localInfos.length > 0)
            return this.localInfos
        let keyCounter = 0
        this.vertexes.forEach(v => {

            let gt = v.gt
            let color = props.getVertexColorFromGt(gt, false)
            let partLocal = (v.items.length / this.itemCount * 100).toString().substr(0, 5) + '%'
            let partTotal = (v.items.length / ItemDictionnary.getItemCountFromGT(gt) * 100).toString().substr(0, 5) + '%'
            
            let info = Popup.buildInfo('' + this.x + '' + this.y + '' + keyCounter, color, ItemDictionnary.meaning.get(gt)!, '' + v.items.length, partLocal, partTotal)
            // v.localInfo = info
            keyCounter += 1
            this.localInfos[this.localInfos.length] = info
        })
    }
}

export class Edge {
    weight: number = 0
    from: Vertex
    to: Vertex
    graph: Graph
    gt: number
    active: boolean = false
    
    constructor(from: Vertex, to: Vertex) {
        this.from = from
        this.to = to
        this.gt = from.gt
        this.graph = from.graph
        this.graph.addEdge(this)
    }

    draw(context: CanvasRenderingContext2D, props: DrawingProperties, yFrom: number): number {
        let xFrom = this.from.xDraw + props.wVertex
        let xTo = this.to.xDraw
        let yTo = this.to.getEdgeYfrom(this) * props.wFlux + this.to.yDraw
        let useGrowTrick = false
        let width = this.weight * props.wFlux
        if (width < props.wFluxMin) {
            useGrowTrick = true
        }
        yFrom = yFrom + width / 2
        yTo = yTo + width / 2
        this.to.yEdgeFrom += width
        context.lineWidth = width

        let xMid = (xFrom + xTo) / 2
        let useInactiveColor = (this.graph.useActivations && !this.active)
        context.beginPath()
        if (useGrowTrick) {
            context.lineWidth = props.wFluxMin
            // context.moveTo(xFrom, yFrom)
            // context.bezierCurveTo(xMid - props.wFluxMin, yFrom, xMid - props.wFluxMin, yTo, xTo, yTo)
            // context.bezierCurveTo(xMid + props.wFluxMin, yTo, xMid + props.wFluxMin, yFrom, xTo, yFrom)
            // context.fillStyle = props.getEdgeColorFromGt(this.gt, useInactiveColor)
            // context.fill()
        }
        // } else {
            context.strokeStyle = props.getEdgeColorFromGt(this.gt, useInactiveColor)
            context.moveTo(xFrom, yFrom)
            context.bezierCurveTo(xMid, yFrom, xMid, yTo, xTo, yTo)
            // context.lineTo(xTo, yTo)
            context.stroke()
        // }

        return yFrom + width / 2

    }
}

