import { SmashChart, TimeAxisHeight } from "./smash-chart";

export class Canvas {

  element: Element;

  constructor(private context: SmashChart) {
    this.element = this.createCanvas();
  }

  get width(): number {
    return (this.context.container.clientWidth - this.context.margins.left - this.context.margins.right) * this.context.pixelRatio;
  }

  get height(): number {
    return (this.context.container.clientHeight - this.context.margins.top - this.context.margins.bottom + TimeAxisHeight) * this.context.pixelRatio;;
  }

  createCanvas() {
    const canvas = document.createElement('CANVAS');
    canvas.setAttribute('height', this.height + '');
    canvas.setAttribute('width', this.width + '');
    canvas.setAttribute('id', 'canvas')
    canvas.classList.add('plot-area');
    canvas.style.position = 'absolute';
    canvas.style.top = this.context.margins.top + 'px';
    canvas.style.left = this.context.margins.left + 'px';
    canvas.style.width = this.context.innerWidth + 'px';
    canvas.style.height = this.context.innerHeight + TimeAxisHeight + 'px';
    return canvas;
  }
}