import React from "react";

interface InfoProps {
    color: string
    className: string
    itemCount: string
    partLocal: string
    partGlobal: string
}

interface HeaderProps {
    itemCount: number
    totalItemCount: number
}

interface PopupProps {
}

interface PopupState {
    header: JSX.Element | undefined
    content: JSX.Element[]
    position: [number, number] | undefined
}

class Popup extends React.Component<PopupProps, PopupState> {
    
    xOffset: number = 30
    yOffset: number = 100
    
    constructor(props: any) {
        super(props)
        this.state = {content: [], position: undefined, header: undefined}
    }

    addInfo(color: string, className: string, itemCount: string, partLocal: string, partGlobal: string) {
        let i = <Info key={'info' + this.state.content.length} color={color} className={className} itemCount={itemCount} partLocal={partLocal} partGlobal={partGlobal} />
        let s : PopupState = {content: [], position: this.state.position, header: this.state.header}
        s.content = this.state.content
        s.content[s.content.length] = i 
        this.setState(s)
    }

    static buildInfo(key: string, color: string, className: string, itemCount: string, partLocal: string, partGlobal: string): JSX.Element {
        let i = <Info key={'info' + key} color={color} className={className} itemCount={itemCount} partLocal={partLocal} partGlobal={partGlobal} />
        return i
    }

    setInfos(infos: JSX.Element[]) {
        let s : PopupState = {content: infos, position: this.state.position, header: this.state.header}
        this.setState(s)
    }

    setPos(x: number, y: number) {
        x = x + this.xOffset
        y = y + this.yOffset
        let s : PopupState = {content: this.state.content, position: [x, y], header: this.state.header}
        this.setState(s)        
    }

    removePos() {
        let s : PopupState = {content: this.state.content, position: undefined, header: this.state.header}
        this.setState(s)
    }

    setHeader(localCount: number, totalCount: number) {
        let i = <InfoHeader key='header' itemCount={localCount} totalItemCount={totalCount}/>
        let s : PopupState = {content: this.state.content, position: this.state.position, header: i}
        this.setState(s)
    }

    clearInfo() {
        this.setState({content: []})
    }


    render() {
        let s :React.CSSProperties= {display: 'none'}
        if (this.state.position !== undefined){
            s = {position: 'absolute', top:this.state.position[1], left: this.state.position[0]}
        }
        if (this.state.header !== undefined) {
            let k = [this.state.header].concat(this.state.content)
            return <div id='popup' style={s}>
                    {k}
                </div>
        } else {
            return <div id='popup' style={s}>
                {this.state.content}
            </div>
        }
    }

}

class Info extends React.Component<InfoProps> {
    color: string | undefined

    constructor(props: any) {
        super(props)
        this.color = props.color
    }

    render() {
        let content = <p></p>
        if (this.color !== undefined) {
            content = 
            <p>
                <span className='colorTik' style={{backgroundColor: this.color}}/>
                <span className='itemName'>
                    {this.props.className}
                </span>
                <span className='itemStats'>
                    ({this.props.itemCount} items | {this.props.partLocal} of this group, {this.props.partGlobal} of class)
                </span>
            </p>
        }

        return content
    }
}

class InfoHeader extends React.Component<HeaderProps> {

    render() {
        let s = this.props.itemCount / this.props.totalItemCount * 100
        let ss = s.toString().substr(0, 5) + '%'
        let content = 
            <p>
                <span className='itemName'>
                    {this.props.itemCount} items
                </span>
                <span className='itemStats'>
                    ({ss} of data)
                </span>
            </p>

        return content
    }
}

export default Popup