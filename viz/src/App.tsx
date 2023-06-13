import React from 'react';
import './App.css';
import GraphFileLoader from './GraphFileLoader';

enum Demos {
  FashionLenet,
  MnistLenet,
  MnistVGG16,
  FashionLenetMnist,
  None
}

interface AppState {
  demo: JSX.Element
}

class App extends React.Component<any, AppState> {

  rootFashionLenet: string = "fashion-lenet-ez/"
  rootMnistLenet: string = "mnist-lenet-ez/"
  rootMnistVgg16: string = "mnist-vgg16/"
  rootMistrained: string = "fashion-lenet-ez-trained-mnist/"

  constructor(props: any) {
    super(props)
    this.state = { demo: <GraphFileLoader /> }
  }

  loadDemo(type: Demos) {
    let b = <GraphFileLoader dicoFilePath="" dicoMeaningFilePath="" graphFilePath="" mclFilePath="" hideButtons={false} />
    switch (type) {
      case Demos.FashionLenet:
        b = <GraphFileLoader key='fashionlenet' hideButtons={true} rootDirectory={this.rootFashionLenet}/>
        break;

      case Demos.MnistLenet:
        b = <GraphFileLoader key='mnistlenet' hideButtons={true} rootDirectory={this.rootMnistLenet}/>
        break;

        case Demos.MnistVGG16:
          b = <GraphFileLoader key='mnistvgg16' hideButtons={true} rootDirectory={this.rootMnistVgg16}/>
          break;

      case Demos.FashionLenetMnist:
        b = <GraphFileLoader key='mnistfashionlenet' hideButtons={true} rootDirectory={this.rootMistrained} />
        break;

      case Demos.None:
        b = <GraphFileLoader key='nodemo' />
        break;
    }

    this.setState({ demo: b })
  }


  render() {

    return (
      <div className="App">
        <header className="App-header" style={{ marginBottom: '2%' }}>
          <span style={{ marginRight: '2%' }}>Examples:</span>
          <button
            className="linkable-button"
            onClick={(e: any) => this.loadDemo(Demos.FashionLenet)}
          >Conv network trained and tested on Fashion-MNIST</button>

          <button
            className="linkable-button"
            onClick={(e: any) => this.loadDemo(Demos.MnistLenet)}
          >Conv network trained and tested on MNIST</button>

<button
            className="linkable-button"
            onClick={(e: any) => this.loadDemo(Demos.MnistVGG16)}
          >VGG16 & original weights tested on MNIST</button>

          <button
            className="linkable-button"
            onClick={(e: any) => this.loadDemo(Demos.FashionLenetMnist)}
          >Conv network trained with MNIST but tested on Fashion-MNIST</button>

          <button
            className="linkable-button"
            onClick={(e: any) => this.loadDemo(Demos.None)}
          >Empty</button>
        </header>
        {this.state.demo}
      </div>
    );
  }
}

export default App;
