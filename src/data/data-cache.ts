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
    this.context.viewCache.update(layeredData);
    console.log('viewStartIndex: ' + this.viewStartIndex + ', cache size: ' + this.cache[0].length);
  }

  setViewStartIndex() {
    const startIndex = this.cache[0].length - this.context.state.viewSize - 1;
    this.viewStartIndex = startIndex < 0 ? 0 : startIndex;
  }
}