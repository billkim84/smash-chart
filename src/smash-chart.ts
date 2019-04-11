import * as d3 from 'd3';
import { Subject } from 'rxjs';

import { ViewCache, Widget, ChartType } from './data/view-cache';
import { DataCahce } from './data/data-cache';
import { Canvas } from './canvas';


declare const createjs: any;

export const TimeAxisHeight = 20;

export class SmashChart {

  svg: any;
  stage: any;
  pixelRatio: number;
  canvas!: Canvas;

  viewCache!: ViewCache;
  dataCache!: DataCahce;
  container: any;

  // ticks: number[];

  state: any = {
    viewSize: 10,
    margin: { top: 50, right: 50, bottom: 50, left: 50 },
    animation: {
      active: false,
      animationCount: 0,
      fps: 20,
    },
    queue: [],
    queueSize: 1,
    timeInterval: 3
  };

  // holds d3 axes
  axes: any = {};

  // event streams
  animationCycleEnded$ = new Subject();

  constructor(id: string, private widget: Widget, options: any, initalData: [][]) {
    this.pixelRatio = window.devicePixelRatio || 1;
    const target = document.getElementById(id);
    if (target) {
      this.container = target;
      this.canvas = new Canvas(this);
      this.dataCache = new DataCahce(initalData, this);
      this.viewCache = new ViewCache(widget, this);

      this.createChartContainer();
      this.prepareAxies();
      this.draw();
    }
    createjs.Ticker.addEventListener('tick', () => this.handleTick());
    console.log(this);
  }

  createChartContainer() {
    const { margin } = this.state;

    this.svg = d3.select(this.container).append('svg')
      .attr('width', this.container.clientWidth)
      .attr('height', this.container.clientHeight)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    this.container.append(this.canvas.element);
    this.stage = new createjs.Stage(this.canvas.element);
  }

  get margins() {
    return this.state.margin;
  }

  get windowWidth() {
    return this.innerWidth * this.pixelRatio / (this.state.viewSize - 1);
  }

  /**
   * Returns the height of chart area.
   */
  get innerHeight(): number {
    const { margin } = this.state;
    return this.container.clientHeight - margin.top - margin.bottom;
  }

  /**
   * Returns the width of chart area.
   */
  get innerWidth(): number {
    const { margin } = this.state;
    return this.container.clientWidth - margin.left - margin.right;
  }

  /**
   * Renders axes. Called once during the initilzation.
   */
  prepareAxies() {
    const requireAxies = this.getRequiredAxes();

    if (requireAxies.left) {
      this.axes.left = this.svg.append('g')
        .attr('class', 'y y-left axis')
        .call(d3.axisLeft(this.viewCache.scales.left));
    }

    if (requireAxies.right) {
      this.axes.right = this.svg.append('g')
        .attr('class', 'y y-right axis')
        .call(d3.axisRight(this.viewCache.scales.right));
    }

    if (requireAxies.bottom) {
      this.axes.bottom = this.svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0, ${this.innerHeight})`);
      this.axes.bottom.append('path').attr('class', 'domain').attr('d', "M0,0H" + this.innerWidth);
    }
  }

  /**
   * Updates axes with new domains. Should be called by ViewCache.
   */
  updateAxes() {
    const requireAxies = this.getRequiredAxes();

    if (requireAxies.left) {
      this.axes.left
        .transition()
        .call(d3.axisLeft(this.viewCache.scales.left));
    }

    if (requireAxies.right) {
      this.axes.right
        .transition()
        .call(d3.axisLeft(this.viewCache.scales.right));
    }
  }

  /**
   * Returns axes required for this chart.
   */
  getRequiredAxes() {
    const axies = {
      left: false,
      right: false,
      bottom: true
    };

    this.widget.legends.forEach(l => {
      if (l.parameters.yAxisSide === 'left') {
        axies.left = true;
      }

      if (l.parameters.yAxisSide === 'right') {
        axies.right = true;
      }

    });

    return axies;
  }

  draw() {
    this.stage.removeAllChildren();

    const { scales } = this.viewCache;
    const layeredData = this.viewCache.viewData;

    const delta = this.windowWidth / this.state.animation.fps * this.state.animation.animationCount;

    this.widget.legends.forEach((l, i) => {
      const layerData = layeredData[i];
      switch (l.parameters.chartType) {
        case ChartType.Line: {
          const line = new createjs.Shape();
          this.stage.addChild(line);
          line.graphics.setStrokeStyle(1);
          line.graphics.beginStroke('#000000');

          layerData.forEach((data, dataIndex) => {
            if (dataIndex === 0) {
              line.graphics.moveTo(0 - delta, data.scaledY);
            } else {
              line.graphics.lineTo(this.windowWidth * dataIndex - delta, data.scaledY);
            }

            // test purpose
            const text = new createjs.Text(data.y, "20px Arial", "#000000");
            text.x = this.windowWidth * dataIndex - delta;
            text.y = data.scaledY;
            this.stage.addChild(text);
          });

          line.graphics.endStroke();
        }
      }
    });

    this.drawTimeTicks(delta);

    this.stage.update();
  }

  drawTimeTicks(delta: number) {
    const timeData = this.viewCache.timeData;
    timeData.forEach((t, i) => {
      if (t) {
        const text = new createjs.Text(t, "20px Arial", "#000000");
        const textWidth = text.getMeasuredWidth();
        text.x = this.windowWidth * i - delta - (textWidth / 2);
        text.y = this.innerHeight * this.pixelRatio + 20;
        text.textBaseline = "alphabetic";
        this.stage.addChild(text);
      }

      const line = new createjs.Shape();
      this.stage.addChild(line);
      line.graphics.setStrokeStyle(1);
      line.graphics.beginStroke('#a6a6a6');

      // line.graphics.moveTo(this.windowWidth * i - delta, this.innerHeight * this.pixelRatio - 20);
      line.graphics.moveTo(this.windowWidth * i - delta, 0);
      line.graphics.lineTo(this.windowWidth * i - delta, this.innerHeight * this.pixelRatio + 20);

      this.stage.addChild(line);
    })
  }

  handleTick() {
    if (this.state.animation.active) {
      this.state.animation.animationCount++;

      // animation cycle ended
      if (this.state.animation.animationCount === this.state.animation.fps) {
        this.state.animation.animationCount = 0;
        this.state.animation.active = false;
        this.animationCycleEnded$.next();
      } else {
        this.draw();
      }
    }

    if (!this.state.animation.active) {
      const nextData = this.state.queue.shift();
      if (nextData) {
        this.dataCache.update(nextData);
        this.state.animation.active = true;
        this.draw();
      }
    }
  }

  pushData(data: any[][]) {
    // this.dataCache.update(data);
    this.state.queue.push(data);
  }

  zoomIn(viewSize: number) {

    if (this.state.viewSize - viewSize > 10) {
      this.state.viewSize -= viewSize;
      this.dataCache.setViewStartIndex();
      this.viewCache.init();
      this.updateAxes();
      this.draw();
    }
  }

  zoomOut(viewSize: number) {
    this.state.viewSize += viewSize;
    this.dataCache.setViewStartIndex();
    this.viewCache.init();
    this.updateAxes();
    this.draw();
  }
}