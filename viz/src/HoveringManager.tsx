import { Component } from "react";
import React from "react";
import Popup from "./Popup";

export enum InteractionType {
    Hover,
    Click,
}

class InteractionManager extends Component{
    fakeColorHoverR: number = 0
    fakeColorHoverG: number = 0
    fakeColorHoverB: number = 0
    fakeColorClickR: number = 0
    fakeColorClickG: number = 0
    fakeColorClickB: number = 0
    hoverBehaviors: Map<string, BehaviorFunction> = new Map()
    clickBehaviors: Map<string, BehaviorFunction> = new Map()

    hoverFunction: (ev: MouseEvent) => void = () => {}
    clickFunction: (ev: MouseEvent) => void = () => {}

    msTicker: number = 8
    active: boolean = true

    trueCanvas: HTMLCanvasElement | null = null
    fakeCanvasHover: React.RefObject<HTMLCanvasElement>
    fakeContextHover: CanvasRenderingContext2D | null = null
    fakeCanvasClick: React.RefObject<HTMLCanvasElement>
    fakeContextClick: CanvasRenderingContext2D | null = null
    pu: React.RefObject<Popup>

    constructor(props: any) {
        super(props)
        this.fakeCanvasHover = React.createRef()
        this.fakeCanvasClick = React.createRef()
        this.pu = React.createRef()
        this.hoverFunction = this.interactiveFunction(InteractionType.Hover)
        this.clickFunction = this.interactiveFunction(InteractionType.Click)
    }

    interactiveFunction(type: InteractionType) {
        return (ev:MouseEvent) => {
            let x = ev.offsetX
            let y = ev.offsetY
            let e = this.getBehaviorAtPosition(type, x, y)
            if (e !== undefined) {
                e.apply(x, y, this.pu.current!)
            }
        }
    }

    initializeCanvas(canvas: HTMLCanvasElement) {
        this.trueCanvas = canvas
        let c = this.fakeCanvasHover.current as HTMLCanvasElement
        c.setAttribute('width', canvas.getAttribute('width')!)
        c.setAttribute('height', canvas.getAttribute('height')!)
        this.fakeContextHover = c.getContext('2d')
        let c2 = this.fakeCanvasClick.current as HTMLCanvasElement
        c2.setAttribute('width', canvas.getAttribute('width')!)
        c2.setAttribute('height', canvas.getAttribute('height')!)
        this.fakeContextClick = c2.getContext('2d')
        // let f = (x: number, y: number) => {
        //     let e = this.getBehaviorAtPosition(InteractionType.Hover, x, y)
        //     if (e !== undefined) {
        //         e.apply(x, y, this.pu.current!)
        //     }
        // }
        // let g = (x: number, y: number) => {
        //     let e = this.getBehaviorAtPosition(InteractionType.Click, x, y)
        //     if (e !== undefined) {
        //         e.apply(x, y, this.pu.current!)
        //     }
        // }
        // canvas.onmousemove = (ev: MouseEvent) => {
        //     let x = ev.offsetX
        //     let y = ev.offsetY
        //     f(x, y) 
        // }
        // canvas.onmousedown = (ev: MouseEvent) => {
        //     let x = ev.offsetX
        //     let y = ev.offsetY
        //     g(x, y) 
        // }
        canvas.onmousemove = this.hoverFunction
        canvas.onmousedown = this.clickFunction
    }

    nextColorHover() {
        if (this.fakeColorHoverR === 255) {
            this.fakeColorHoverR = 0
            if (this.fakeColorHoverG === 255) {
                this.fakeColorHoverG = 0
                ++this.fakeColorHoverB
            } else {
                ++this.fakeColorHoverG
            }
        } else {
            ++this.fakeColorHoverR
        }

        return this.rgbToHex(this.fakeColorHoverR, this.fakeColorHoverG, this.fakeColorHoverB)
    }

    nextColorClick() {
        if (this.fakeColorClickR === 255) {
            this.fakeColorClickR = 0
            if (this.fakeColorClickG === 255) {
                this.fakeColorClickG = 0
                ++this.fakeColorClickB
            } else {
                ++this.fakeColorClickG
            }
        } else {
            ++this.fakeColorClickR
        }

        return this.rgbToHex(this.fakeColorClickR, this.fakeColorClickG, this.fakeColorClickB)
    }

    rgbToHex(r: number, g: number, b: number) {
        let s = "#" + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0')
        return s
    }

    drawInteractiveRect(type: InteractionType, x: number, y: number, w: number, h: number) {
        let c = this.fakeContextHover!
        // x = Math.floor(x)
        // y = Math.floor(y)
        // w = Math.floor(w) + 1
        // h = Math.floor(h) + 1
        if (type === InteractionType.Click) {
            c = this.fakeContextClick!
            c.fillStyle = this.nextColorClick()
        } else if (type === InteractionType.Hover) {
            c.fillStyle = this.nextColorHover()
        }

        c.fillRect(x, y, w, h)
    }

    addInteraction(type: InteractionType, f: (x: number, y:number, pu: Popup) => void) {
        let dest = this.hoverBehaviors
        let r = this.fakeColorHoverR
        let g = this.fakeColorHoverG
        let b = this.fakeColorHoverB
        if (type === InteractionType.Click) {
            dest = this.clickBehaviors
            r = this.fakeColorClickR
            g = this.fakeColorClickG
            b = this.fakeColorClickB
        }
        dest.set(this.rgbToHex(r, g, b), new BehaviorFunction(f))
    }

    getBehaviorAtPosition(type: InteractionType, x: number, y: number): BehaviorFunction | undefined {
        // if (!this.active)
            // return undefined
        // this.active = false
        this.trueCanvas!.onmousemove = null
        this.trueCanvas!.onmousedown = null
        // setInterval(() => {
            this.trueCanvas!.onmousemove = this.hoverFunction
            this.trueCanvas!.onmousedown = this.clickFunction
        // }, this.msTicker)
        let dest = this.hoverBehaviors
        let c = this.fakeContextHover!
        if (type === InteractionType.Click) {
            dest = this.clickBehaviors
            c = this.fakeContextClick!
        }
        let data = c.getImageData(x, y, 1, 1).data
        let r = data[0]
        let g = data[1]
        let b = data[2]
        return dest.get(this.rgbToHex(r, g, b))
    }

    render() {
        return [<canvas
            key='fakeCanvasHover'
            ref={this.fakeCanvasHover}
            style={{display: 'none'}}
            >
            </canvas>,
            <canvas
            key='fakeCanvasClick'
            ref={this.fakeCanvasClick}
            style={{display: 'none'}}
            >
            </canvas>,
            <Popup ref={this.pu} key='popup'/>]
    }
}

export class BehaviorFunction {

    f: (x: number, y: number, pu: Popup) => void

    constructor(f: (x: number, y: number, pu: Popup) => void) {
        this.f = f
    }

    apply(x: number, y: number, pu: Popup) {
        this.f(x, y, pu)
    }
}

export default InteractionManager