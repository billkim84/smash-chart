import * as d3 from 'd3';
import { SmashChart, TimeAxisHeight, ChartMode } from '../smash-chart';

export enum WidgetType {
  TimeSeries = 'TIME_SERIES',
  TimeSeriesVertical = 'TIME_SERIES_VERTICAL'
}

export enum ChartType {
  StackedBar = 'bar',
  NonStackedBar = 'bar2',
  Bubble = 'bubble',
  Line = 'line'
}

export interface Widget {
  type: WidgetType;
  autoAdjustWindowSize: boolean;
  centerZeroLine: boolean;
  splitLeftRight: boolean;
  metaData: any;
  legends: Legend[];
}

export interface Legend {
  id: any;
  parameters: any;
}

export interface ChartOpitons {
  isVertical?: boolean;
  centerZeroLine?: boolean;
  splitLeftRight?: boolean;
}

export interface Domains {
  left: {
    min: number,
    max: number
  },
  right: {
    min: number,
    max: number
  }
}

export class ViewCache {

  viewData: any[][] = [];
  timeData: (number | null)[] = [];
  domains: any;
  scales: any;
  chartOptions = {
    isVertical: false,
    centerZeroLine: false,
    splitLeftRight: false
  };
  tickCounter = 0;
  needScaleUpdate = false;

  constructor(private widget: Widget, private context: SmashChart) {
    this.init();
    this.context.animationCycleEnded$.subscribe(() => this.remove());
  }

  init() {
    this.viewData = this.context.dataCache.getCurrentViewData();
    this.domains = this.findDomains(this.viewData);
    this.initTimeData();
    this.updateScales();
    this.calcData(this.viewData);
  }

  initTimeData() {
    this.timeData = [];
    for (let i = 0; i < this.viewData[0].length; i++) {
      this.tickCounter++;

      if (this.tickCounter === this.context.state.timeInterval) {
        this.timeData.push(this.viewData[0][i].time);
        this.tickCounter = 0;
      } else {
        this.timeData.push(null);
      }

    }
  }

  updateScales() {
    const range = this.widget.type === WidgetType.TimeSeriesVertical ? [0, this.context.innerHeight] : [this.context.innerHeight, 0];
    const rangeWithPixelRatio = [range[0] * this.context.pixelRatio, range[1] * this.context.pixelRatio]
    this.scales = {
      left: d3.scaleLinear()
        .domain([this.domains.left.min, this.domains.left.max])
        .range(range),
      right: d3.scaleLinear()
        .domain([this.domains.right.min, this.domains.right.max])
        .range(range),
      bottom: d3.scaleLinear()
        .domain([0, this.context.state.viewSize - 1])
        .range([0, this.context.innerWidth]),
      leftY: d3.scaleLinear()
        .domain([this.domains.left.min, this.domains.left.max])
        .range(rangeWithPixelRatio),
      rightY: d3.scaleLinear()
        .domain([this.domains.right.min, this.domains.right.max])
        .range(rangeWithPixelRatio),
    }
  }

  findDomains(layeredData: any[][]): Domains {
    const leftYAxisLayerIndecies: number[] = [];
    const rightYAxisLayerIndecies: number[] = [];

    this.widget.legends.forEach((l, i) => {
      if (l.parameters.yAxisSide === 'left') {
        leftYAxisLayerIndecies.push(i);
      } else {
        rightYAxisLayerIndecies.push(i);
      }
    })

    return {
      left: this.findMinAndMax(layeredData, leftYAxisLayerIndecies),
      right: this.findMinAndMax(layeredData, rightYAxisLayerIndecies)
    }
  }

  /**
   *
   * @param layeredData Each layer must have the same number of data.
   * @param layerIndices
   */
  findMinAndMax(layeredData: any[][], layerIndices: number[]): { min: number, max: number } {
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    let barPositiveSum = 0;
    let barNegativeSum = 0;
    let hasBarChart = false;
    let layerLength = layeredData[0].length;


    for (let i = 0; i < layerLength; i++) {
      layerIndices.forEach(layerIndex => {
        const legend = this.widget.legends[layerIndex];
        const chartType = legend.parameters.chartType;

        // skip inactive legend
        if (!this.isLegendActive(legend)) return;

        const data = layeredData[layerIndex][i];
        const y = data ? data.y : null;

        if (!this.isNumber(y)) return;

        if (chartType === ChartType.StackedBar) {
          y > 0 ? barPositiveSum += y : barNegativeSum += y;
          hasBarChart = true;
        } else {

          if (chartType === ChartType.Bubble) {
            const tailPoint = data.tailPoint;
            if (this.isNumber(tailPoint)) {
              min = Math.min(min, tailPoint);
              max = Math.max(max, tailPoint);
            }
          }

          min = Math.min(min, y);
          max = Math.max(max, y);
        }
      });

      if (hasBarChart) {
        min = Math.min(min, barNegativeSum);
        max = Math.max(max, barPositiveSum);
        barPositiveSum = 0;
        barNegativeSum = 0;
      }
    }

    return {
      min: min === Number.MAX_VALUE ? 0 : min,
      max: max === Number.MIN_VALUE ? 0 : max,
    }
  }

  calcData(data: any[][]) {
    data.forEach((layerData, layerIndex) => {
      layerData.forEach(data => {
        if (this.isNumber(data.y)) {
          const legend = this.widget.legends[layerIndex];
          data.scaledY = legend.parameters.yAxisSide === 'left' ? this.scales.leftY(data.y) : this.scales.rightY(data.y);
        }
      });
    });
  }

  isLegendActive(legend: Legend): boolean {
    return legend.parameters.isActive;
  }

  update(data: any[][], isPrepend = false) {

    this.updateTimeData(data, isPrepend);

    // find domains from the new data and update domains if needed
    const domainsFromNewData = this.findDomains(data);
    this.updateDomains(domainsFromNewData);

    if (this.needScaleUpdate) {
      this.updateScales();
      // append or prepend data first and re-calculate the entire data
      isPrepend ? this.prependData(data) : this.appendData(data);
      this.calcData(this.viewData);
      this.context.updateAxes();
      this.needScaleUpdate = false;
    } else {
      this.calcData(data);
      isPrepend ? this.prependData(data) : this.appendData(data);
    }
  }

  append(data: any[][]) {
    this.update(data);
  }

  prepend(data: any[][]) {
    this.update(data, true);
  }

  /**
   * Remove the first element on each data layer and time data array.
   * Must be called after an animation cycle end
   */
  remove() {
    this.viewData.forEach((layeredData, layerIndex) => {
      const legend = this.widget.legends[layerIndex];
      const removedData = layeredData.shift();
      const domain = legend.parameters.yAxisSide === 'left' ? this.domains.left : this.domains.right;
      if (removedData.y === domain.max || removedData.y === domain.min) {
        this.needScaleUpdate = true;
      }
    });
    this.timeData.shift();
  }

  /**
   * Updates domains if necessary. If domain needs to be updated, scales need to be updated too.
   * @param newDomains
   */
  updateDomains(newDomains: Domains) {
    let needScaleUpdate = false;
    const { left: newLeft, right: newRight } = newDomains;
    const { left, right } = this.domains;

    if (left.min > newLeft.min || left.max < newLeft.max || right.min > newRight.min || right.max < newRight.max) {
      this.domains = {
        left: {
          min: Math.min(left.min, newLeft.min),
          max: Math.max(left.max, newLeft.max)
        },
        right: {
          min: Math.min(right.min, newRight.min),
          max: Math.max(right.max, newRight.max)
        }
      };
      needScaleUpdate = true;
    }

    if (needScaleUpdate) {
      this.needScaleUpdate = true;
    }
  }

  private updateTimeData(data: any[][], isPrepend = false) {
    data[0].forEach(d => {
      const emptyTimeWindowCount = this.countEmptyTimeValues(!isPrepend);
      // there is a hidden extra data point at the end of chart.
      const shouldAddNextTimeValue = emptyTimeWindowCount === this.context.state.timeInterval - 1;
      const timeValue = shouldAddNextTimeValue ? d.time : null;

      if (this.context.mode === ChartMode.Realtime) {
        // for animation we cannot remove the first element here
        // the first element will be removed after animation cycle done
        this.timeData.push(timeValue);
      } else {
        if (isPrepend) {
          this.timeData.pop();
          this.timeData.unshift(timeValue);
        } else {
          this.timeData.shift();
          this.timeData.push(timeValue)
        }
      }
    });


    // data[0].forEach(d => {
    //   this.tickCounter++;
    //   if (this.tickCounter === this.context.state.timeInterval) {
    //     // append or prepend time
    //     if (this.context.mode === ChartMode.Realtime) {
    //       this.timeData.push(d.time);
    //     } else {
    //       isPrepend ? this.timeData.unshift(d.time) : this.timeData.push(d.time);
    //       if (isPrepend) {
    //         this.timeData.pop();
    //         this.timeData.unshift(d.time);
    //       } else {
    //         this.timeData.shift();
    //         this.timeData.push(d.time)
    //       }
    //     }
    //     this.tickCounter = 0;
    //   } else {
    //     if (this.context.mode === ChartMode.Realtime) {
    //       this.timeData.push(null);
    //     } else {
    //       if (isPrepend) {
    //         this.timeData.pop();
    //         this.timeData.unshift(null);
    //       } else {
    //         this.timeData.shift();
    //         this.timeData.push(null)
    //       }
    //     }
    //   }
    // });
  }

  private countEmptyTimeValues(backward = false): number {
    let count = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const k = backward ? this.timeData.length - 1 - i : i;
      if (this.timeData[k] === null) {
        count++;
      } else {
        return count;
      }
    }
    return count;
  }

  private appendData(data: any[][]) {
    data.forEach((layeredData, layerIndex) => {
      this.viewData[layerIndex] = this.viewData[layerIndex].concat(layeredData);
    });
  }

  private prependData(data: any[][]) {
    data.forEach((layeredData, layerIndex) => {
      this.viewData[layerIndex] = layeredData.concat(this.viewData[layerIndex]);
    });
  }

  /**
   * Divides charting area in half.
   * Drawing left axis's plots in the top half and right axis's plots in the bottom half.
   * This option provides clear separation between left and right axies plots.
   * @param minMax
   */
  private applySplitLeftRight(minMax: { min: number, max: number }) {
    // only apply if both axies are using and y-axis visibility is set to all-axies
  }

  private isNumber(n: any): boolean {
    if (n !== null || n !== undefined) {
      return !isNaN(parseFloat(n)) && isFinite(n) && n.toString().indexOf('e') === -1;
    }
    return false;
  }
}