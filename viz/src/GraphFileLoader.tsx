import React from 'react';
import MclFileReader, { FileType } from './MclFileReader';
import GraphDrawer from './GraphDrawer';
import { Explanation } from './Explanation';

interface GFLProps {

    rootDirectory?: string
    dicoFilePath?: string 
    dicoMeaningFilePath?: string 
    graphFilePath?: string 
    mclFilePath?: string
    explainFilePath?: string
    hideButtons?: boolean 
}

interface GFLState {
    dicoFileOkay: boolean,
    graphFileOkay: boolean,
    mclFileOkay: boolean,
}

class GraphFileLoader extends React.Component<GFLProps, GFLState> {
    state = {
        dicoFileOkay: false,
        graphFileOkay: false,
        mclFileOkay: false,
    }
    // fileSelection: any
    dicoFileSelection: any
    dicoMeaningFileSelection: any
    graphFileSelection: any
    mclFileSelection: any
    graph: any
    editedProps: GFLProps = {}
    // mggraph: MGGraph | undefined
    fileReader: MclFileReader

    assignDefaultValues() {
        console.log(this.props)
        this.editedProps.dicoFilePath = this.props.dicoFilePath === undefined ? "DataDictionary.csv" : this.props.dicoFilePath
        this.editedProps.dicoMeaningFilePath = this.props.dicoMeaningFilePath === undefined ? "meaning.txt" : this.props.dicoMeaningFilePath
        this.editedProps.graphFilePath = this.props.graphFilePath === undefined ? "graph.txt" : this.props.graphFilePath
        this.editedProps.explainFilePath = this.props.explainFilePath === undefined ? "explanation.txt" : this.props.explainFilePath
        this.editedProps.mclFilePath = this.props.mclFilePath === undefined ? "outAll" : this.props.mclFilePath
        this.editedProps.hideButtons = this.props.hideButtons === undefined ? false : this.props.hideButtons
        this.editedProps.rootDirectory = this.props.rootDirectory
        console.log(this.editedProps)
    }

    constructor(props: any) {
        super(props);
        this.assignDefaultValues()
        // this.fileSelection = React.createRef()
        this.dicoFileSelection = React.createRef()
        this.dicoMeaningFileSelection = React.createRef()
        this.graphFileSelection = React.createRef()
        this.mclFileSelection = React.createRef()
        this.fileReader = new MclFileReader()
        this.graph = React.createRef()
        if (this.editedProps.rootDirectory !== "") {
            this.fileReader.setLocalFile(this.editedProps.rootDirectory + "/" + this.editedProps.dicoFilePath).then(
                () => this.fileReader.compute(this.fileReader.file!, FileType.Dico)).then(
                () => this.fileReader.setLocalFile(this.editedProps.rootDirectory + "/" + this.editedProps.dicoMeaningFilePath)).then(
                () => this.fileReader.compute(this.fileReader.file!, FileType.DicoMeaning)).then(
                () => this.fileReader.setLocalFile(this.editedProps.rootDirectory + "/" + this.editedProps.mclFilePath)).then(
                () => this.fileReader.compute(this.fileReader.file!, FileType.Mcl)).then(
                () => this.fileReader.setLocalFile(this.editedProps.rootDirectory + "/" + this.editedProps.graphFilePath)).then(
                () => this.fileReader.compute(this.fileReader.file!, FileType.Graph)).then(
                () => this.onDrawGraphClick(null))
        }
    }

    // onChangeLoad(event: any) {
    //     if (event.target.files !=== null) {
    //         this.setState({file: event.target.files[0]})
    //         console.log("file set")
    //         this.fileReader.setFile(event.target.files[0])
    //         let prom = this.fileReader.compute()
    //         prom.then((data: MclData) => {
    //             let g = (this.graph.current as GraphDrawer)
    //             g.draw(data)
    //         })
    //         event.target.value = null
    //     }
    // }

    // onButtonClick(event: any) {
    //     this.fileSelection.current.click()
    // }



    onLoadDicoClick(event: any) {
        this.dicoFileSelection.current.click()
    }

    onLoadDicoMeaningClick(event: any) {
        this.dicoMeaningFileSelection.current.click()
    }

    onLoadGraphClick(event: any) {
        this.graphFileSelection.current.click()
    }

    onLoadMclClick(event: any) {
        this.mclFileSelection.current.click()
    }

    onDrawGraphClick(event: any) {
        let g = (this.graph.current as GraphDrawer)
        console.log(this.fileReader.graph!)
        g.drawGraph(this.fileReader.graph!)
        // this.mggraph = this.fileReader.graph!
    }

    onChangeDicoFile(event: any) {
        if (event.target.files !== null) {
            this.fileReader.setFile(event.target.files[0])
            let prom = this.fileReader.compute(this.fileReader.file!, FileType.Dico)
            prom.then(() => {
                this.setState({ dicoFileOkay: true })
            })

            event.target.value = null
        }
    }

    onChangeDicoMeaningFile(event: any) {
        if (event.target.files !== null) {
            this.fileReader.setFile(event.target.files[0])
            let prom = this.fileReader.compute(this.fileReader.file!, FileType.DicoMeaning)
            prom.then(() => {
                this.setState({ dicoFileOkay: true })
            })

            event.target.value = null
        }
    }

    onChangeGraphFile(event: any) {
        if (event.target.files !== null) {
            this.fileReader.setFile(event.target.files[0])
            let prom = this.fileReader.compute(this.fileReader.file!, FileType.Graph)
            prom.then(() => {
                this.setState({ graphFileOkay: true })
            })

            event.target.value = null
        }
    }

    onChangeMclFile(event: any) {
        if (event.target.files !== null) {
            this.fileReader.setFile(event.target.files[0])
            let prom = this.fileReader.compute(this.fileReader.file!, FileType.Mcl)
            prom.then(() => {
                this.setState({ mclFileOkay: true })
            })

            event.target.value = null
            
        }
    }

    onToggleError(event: any) {
        // MGGraph.toggleShowingError()
        // let g = (this.graph.current as GraphDrawer)
        // g.drawGraph(this.fileReader.graph!)
    }

    render() {
        if (!this.props.hideButtons) {
            return ([
                <button
                    key='loadDico'
                    onClick={(e: any) => this.onLoadDicoClick(e)}>
                    Load Dictionary File
                </button>,
                <button
                    key='loadDicoMeaning'
                    onClick={(e: any) => this.onLoadDicoMeaningClick(e)}>
                    Load Dictionary Meaning File
                </button>,
                <form key='dicoFileForm'>
                    <input
                        type='file'
                        ref={this.dicoFileSelection}
                        style={{ display: 'none' }}
                        onChange={(e: any) => this.onChangeDicoFile(e)}
                    />
                </form>,
                <form key='dicoMeaningFileForm'>
                    <input
                        type='file'
                        ref={this.dicoMeaningFileSelection}
                        style={{ display: 'none' }}
                        onChange={(e: any) => this.onChangeDicoMeaningFile(e)}
                    />
                </form>,
                <button
                    key='loadMcl'
                    onClick={(e: any) => this.onLoadMclClick(e)}
                    disabled={!this.state['dicoFileOkay']}>
                    Load Mcl File
        </button>,
                <form key='mclFileForm'>
                    <input
                        type='file'
                        ref={this.mclFileSelection}
                        style={{ display: 'none' }}
                        onChange={(e: any) => this.onChangeMclFile(e)}
                    />
                </form>,
                <button
                    key='loadGraph'
                    onClick={(e: any) => this.onLoadGraphClick(e)}
                    disabled={!this.state['mclFileOkay']}>
                    Load Graph File
            </button>,
                <form key='GraphFileForm'>
                    <input
                        type='file'
                        ref={this.graphFileSelection}
                        style={{ display: 'none' }}
                        onChange={(e: any) => this.onChangeGraphFile(e)}
                    />
                </form>,
                <button
                    key='drawGraphButton'
                    onClick={(e: any) => this.onDrawGraphClick(e)}
                    disabled={!this.state['graphFileOkay']}>
                    Draw Graph
        </button>,
                <button
                    key='toggleErrors'
                    onClick={(e: any) => this.onToggleError(e)}
                    disabled={!this.state['graphFileOkay']}>
                    Toggle Errors
    </button>,
                <br key='br' />,
                <GraphDrawer
                    key='graph'
                    ref={this.graph} />
            ])
        } else {
            let g = (this.graph.current as GraphDrawer)
            let gg = <GraphDrawer
            key='graph'
            ref={this.graph} />
            return [
                gg,
                <Explanation key='expl' graph={g} source={this.editedProps.rootDirectory !== undefined ? this.editedProps.rootDirectory + this.editedProps.explainFilePath : ""} />
            ]
            
        }
    }
}

export default GraphFileLoader;