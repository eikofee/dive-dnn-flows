import React from "react";
import InteractionManager, { InteractionType } from "./HoveringManager";
import { Graph } from "./Graph";
import { ItemDictionnary } from "./ItemDictionnary";
import { DrawingProperties } from "./DrawingProperies";

export class MGDrawingProps {
    hViewSize: number = 800
    wViewSize: number = 1850

    textColor: string = "black";
    yTextOffsetUp: number = 2
    xLayerOffset: number = 5;
    yLayerOffset: number = 15;
    nLayerCountMax: number = 10;
    hLayerSize: number = 800;
    groupBorderColor: string = "#AAAAAA80";
    
    wGroupBorder: number = 80;
    hGroupBorder: number = 20;
    hGroupBorderIn: number = 10;
    wGroupBorderIn: number = 20;
    wGroupSpace: number = 60;
    wSetSize: number = 80;

    hGroupSize: number = 0.8;
    hSetSize: number = 0.8;
    wFluxSize: number = 0.8;
    
    hGroupMinSize: number = 1;
    hSetMinSize: number = 1;
    wFluxMinSize: number = 1;

    hItemSize: number = 1;
    
    // yGroupSpacing: number = 50;
    gtColors: string[] = ["red", "green", "blue"];
    
    xLegendStart: number = 5;
    nLegendCountPerColumn: number = 1;
    wLegendLabel: number = 100;
    hLegendLabel: number = 30;
    wLegendRect: number = 40;
    hLegendRect: any = 20;
    wLegendSpacing: any = 4;
    yLegendTextOffset: number = 16;
    resortIter: number = 20;
    
    hLayerSpace: number = 200;
    getColor(i: number) {
        // const colors = ["blue", "cyan", "red", "magenta", "pink", "yellow", "orange", "green", "purple", "lime"] 
        const colors = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#e7298a", "#666666"] 
        return colors[i]
    }

    getColorAlpha(i: number) {
        const colors = ["#e41a1c40", "#377eb840", "#4daf4a40", "#984ea340", "#ff7f0040", "#ffff3340", "#a6562840", "#f781bf40", "#e7298a40", "#66666640"] 
        return colors[i]
    }

    getColorInactive(i: number) {
        return "#20202020"
    }

    getColorError(i: number) {
        return "black"
    }

    computeGraphWidth(graph: Graph, props: DrawingProperties) {
        let maxSize = ItemDictionnary.getItemCount()
        let maxGroup = 0
        for (let layer = 0; layer < graph.getLayerCount(); ++layer)
        {
            let groupCount = graph.getVertexGroupsOfLayer(layer).length
            if (groupCount > maxGroup) {
                maxGroup = groupCount
            }
        }

        let factor = props.hView / (maxSize + maxGroup * 50)
        this.initialize(factor)
    }

    initialize(sizeModifier: number) {
        // this.wLayerSpace = this.wLayerSpace * sizeModifier
        this.wGroupBorder = this.wGroupBorder * sizeModifier
        this.hGroupBorder = this.hGroupBorder * sizeModifier
        this.wGroupBorderIn = this.wGroupBorderIn * sizeModifier
        this.hGroupBorderIn = this.hGroupBorderIn * sizeModifier
        this.wGroupSpace = this.wGroupSpace * sizeModifier
        this.hLayerSpace = this.hLayerSpace * sizeModifier
        // this.yGroupSpacing = this.yGroupSpacing * sizeModifier
        this.wFluxSize = this.wFluxSize * sizeModifier
        this.hGroupSize = this.hGroupSize * sizeModifier
        this.hSetSize = this.hSetSize * sizeModifier
        this.wSetSize = this.wSetSize * sizeModifier
        this.hItemSize = this.hItemSize * sizeModifier
    }


}

interface IProps {
}

interface IState {
    layerCount: number
    props: DrawingProperties
}

class GraphDrawer extends React.Component<IProps, IState> {

    canvas: React.RefObject<HTMLCanvasElement>
    hoveringManager: React.RefObject<InteractionManager>
    static hm: InteractionManager
    static currentGraph: Graph
    static currentGraphDrawer: GraphDrawer;

    xOffset = 5
    yOffset = 5
    wLayerSize = 50
    hLayerSize = 300
    xLayerSpacing = 200
    yGroupSpacing = 10
    // width = 20000
    // height = 2000

    constructor(props: any) {
        super(props)
        this.canvas = React.createRef()
        this.hoveringManager = React.createRef()
        // drawingProps.initialize(1)
        // let drawingProps = new MGDrawingProps()
        let drawingProps = new DrawingProperties()
        this.state = {layerCount: -1, props: drawingProps}

    }

    public drawGraph(graph: Graph) {
        let drawingProps = new DrawingProperties()
        drawingProps.computeGraphHeight(graph)
        drawingProps.computeAutoProperties(graph)
        graph.avoidEdgeCrossing(150)
        let ct = graph.getLayerCount()
        console.log(ct)
        this.setState({layerCount: ct, props: drawingProps}, () => {
        console.log(this.state.layerCount)
        // this.setState(this.state)
        GraphDrawer.currentGraphDrawer = this
        GraphDrawer.currentGraph = graph
        let c = (this.canvas.current as HTMLCanvasElement).getContext('2d')!
        let canvas = this.canvas.current as HTMLCanvasElement
        // canvas.setAttribute("height", "" + itemCount * 1.3)
        // let hm = this.hoveringManager.current as HoveringManager
        GraphDrawer.hm = this.hoveringManager.current as InteractionManager
        GraphDrawer.hm.initializeCanvas(canvas)
        GraphDrawer.hm.addInteraction(InteractionType.Hover, (x, y, pu) => pu.removePos())
        GraphDrawer.hm.addInteraction(InteractionType.Click, (x, y, pu) => {
                graph.setActivation(false)
                graph.resetActivations()
                this.drawGraph(graph)   
            })        
            c.fillStyle = "white"
            c.fillRect(0, 0, Number(canvas.getAttribute('width')), Number(canvas.getAttribute('height')))
            graph.draw(c, this.state.props)
            console.log(drawingProps)
            graph.drawLegend(c, this.state.props)
            // this.setState(this.state)
            // graph.drawFluxes(c, this.state.props)
    })
    }
    
    render() {
        let factor = this.state.layerCount / Math.min(this.state.layerCount, this.state.props.nLayerCountInView)
        let width = window.outerWidth * (1 + factor) + 600 + this.state.props.xLayerOffset
        if (this.state.layerCount === -1) {
            width = 100
        }
        console.log(this.state.layerCount)
        return ([
            <canvas
                ref={this.canvas}
                // width={(this.state.props.wGroupSpace + (this.state.props.wViewSize / (Math.min(this.state.layerCount, this.state.props.nLayerCountMax)))) * (this.state.layerCount) + 500}
                // width={this.state.props.wGroupSpace + this.state.props.wViewSize * (this.state.layerCount / Math.min(this.state.layerCount, this.state.props.nLayerCountMax)) + 500}
                // width={this.state.layerCount / Math.min(this.state.layerCount, this.state.props.nLayerCountMax) * 100 + '%'}
                // style={style}
                width={width}
                height={this.state.props.hView /*this.state.props.hLegendLabel * (1 + this.state.props.nLegendCountPerColumn)*/}
                key='trueCanvas'
            >

            </canvas>,
            <InteractionManager
                ref={this.hoveringManager}
                key='fakeCanvas'/>
        ])
    }
}

export default GraphDrawer