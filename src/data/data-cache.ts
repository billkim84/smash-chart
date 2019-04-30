import { SmashChart } from "../smash-chart";

export class DataCahce {
  cache: any[][];
  viewStartIndex: number = 0;

  constructor(initalData: any[][] = [], private context: SmashChart) {
    this.cache = initalData;
    this.setViewStartIndex();
    console.log('viewStartIndex: ' + this.viewStartIndex);
  }

  getCurrentViewData() {
    const { viewSize } = this.context.state;
    const end = this.viewStartIndex + viewSize + 1;
    return this.cache.map(layerdData => layerdData.slice(this.viewStartIndex, end));
  }

  update(layeredData: any[][]) {
    layeredData.forEach((dataLayer, index) => {
      this.cache[index] = this.cache[index].concat(dataLayer);
    });
    this.viewStartIndex++;
    this.context.viewCache.update(layeredData);
    console.log('viewStartIndex: ' + this.viewStartIndex);
  }

  setViewStartIndex() {
    const startIndex = this.cache[0].length - this.context.state.viewSize - 1;
    this.viewStartIndex = startIndex < 0 ? 0 : startIndex;
  }

  moveBack(numMoves: number) {
    const originalIndex = this.viewStartIndex;
    const newIndex = this.viewStartIndex - numMoves;
    this.viewStartIndex = newIndex > -1 ? newIndex : 0;
    const data = this.getDataFromRange(newIndex, originalIndex);
    this.context.viewCache.prepend(data);
  }

  moveForward(numMoves: number) {
    const newDataStartIndex = this.viewStartIndex + this.context.state.viewSize + 2;
    const newIndex = this.viewStartIndex + numMoves;
    this.viewStartIndex = newIndex > this.cache[0].length ? this.cache[0].length - 1 : newIndex;
    const dataToAppend = this.getDataFromRange(newDataStartIndex, newDataStartIndex + numMoves);
    this.context.viewCache.append(dataToAppend);
  }

  getDataFromRange(from: number, to: number): any[][] {
    return this.cache.map(layerData => {
      return layerData.slice(from, to);
    })
  }
}