import { Graph } from "./Graph"
import { ItemDictionnary } from "./ItemDictionnary"

export class DrawingProperties {
    hVertexItem: number = 1
    colorGroup: string = "gray"
    wBorderLine: number = 2
    wBorderSpace: number = 4
    colorBackground: string = "white"
    yLayerOffset: number = 48
    xLayerOffset: number = 25
    wFlux: number = 1
    wFluxMin: number = 0.5
    wVertex: number = 24
    wView: number = 1800
    hView: number = 950
    hGroupSpace: number = 775
    // nLayerCountInView: number = 5
    nLayerCountInView: number = 14
    nLegendItemCountOnWidth: number = 5
    hLegendSpace: number = 96
    colorFluxAlpha: string = "60"
    colorFluxInactive: string = "10"
    colorVertexInactive: string = "20"
    // sTextSize: number = 48
    sTextSize: number = 30
    yTextOffsetUp: number = 4
    wLegendRect: number = 80
    hLegendRect: number = 48
    xLegendRectLabelOffset: number = 4

    // Computed properties
    hGroupSpacing: number[] = []
    wLayerSpacing: number = 0
    
    computeAutoProperties(graph: Graph) {
        this.wLayerSpacing = this.wView / (Math.min(graph.getLayerCount(), this.nLayerCountInView)- 1)
        for (let layer = 0; layer < graph.getLayerCount(); ++layer) {
            let groups = graph.getVertexGroupsOfLayer(layer)
            let drawSize = 0
            groups.forEach(g => {
                drawSize += g.getHdrawSize(this)
            })
            let spacing = (this.hView - this.hLegendSpace - this.yLayerOffset - drawSize) / (groups.length)
            this.hGroupSpacing.push(spacing)
        }
    }

    getXfromLayer(x: number): number {
        let pos = (this.wVertex + this.wLayerSpacing) * x + this.xLayerOffset
        return pos 
    }
    getVertexColorFromGt(gt: number, useInactiveColor: boolean): string {
        let suffix = ""
        if (useInactiveColor) {
            suffix = this.colorVertexInactive
        }
        //const colors = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#e7298a", "#666666"] 

        // Colorbrewer without yellow that is unreadable on white background
        // Totaly bad palette :(
        const colors = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99']
        return colors[gt] + suffix
    }

    getEdgeColorFromGt(gt: number, useInactiveColor: boolean): string {
        let suffix = "" + this.colorFluxAlpha
        if (useInactiveColor) {
            suffix = "" + this.colorFluxInactive
        }

        return this.getVertexColorFromGt(gt, false) + suffix
    }

    computeGraphHeight(graph: Graph) {
        let maxSize = ItemDictionnary.getItemCount()
        let maxGroup = 0
        for (let layer = 0; layer < graph.getLayerCount(); ++layer)
        {
            let groupCount = graph.getVertexGroupsOfLayer(layer).length
            if (groupCount > maxGroup) {
                maxGroup = groupCount
            }
        }

        let factor = (this.hView - this.yLayerOffset - this.hLegendSpace) / (maxSize + maxGroup * this.hGroupSpace)
        this.applySizeModifier(factor)
    }

    applySizeModifier(factor: number) {
        this.hVertexItem *= factor
        this.wFlux *= factor
    }

}