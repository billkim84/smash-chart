import { ViewCache, Widget, ChartType } from '../src/data/view-cache';
import { Subject } from 'rxjs';
import { SmashChart } from '../src/smash-chart';

let widget: Widget;
const testData = [
  [{ y: 0 }, { y: 1 }, { y: 2 }, { y: 3 }],
  [{ y: 3 }, { y: 2 }, { y: 1 }, { y: -1 }],
  [{ y: 4 }, { y: 4 }, { y: 3 }, { y: 1 }],
  [{ y: null }, { y: 2 }, { y: null }, { y: -2 }],
  [{ y: 1 }, { y: 3 }, { y: 6 }, { y: 5 }]
];
const context = {
  innerHeight: 100,
  innerWidth: 100,
  pixelRatio: 2,
  state: {
    viewSize: 10
  },
  dataCache: {
    getCurrentViewData: function () { return testData }
  }
} as any;

describe("ViewCache test", () => {

  beforeEach(() => {
    widget = {
      autoAdjustWindowSize: false,
      centerZeroLine: false,
      splitLeftRight: false,
      metaData: {},
      legends: [
        {
          id: 1,
          parameters: {
            isActive: true,
            yAxisSide: 'left'
          }
        },
        {
          id: 2,
          parameters: {
            isActive: true,
            yAxisSide: 'left'
          }
        },
        {
          id: 3,
          parameters: {
            isActive: true,
            yAxisSide: 'left'
          }
        },
        {
          id: 4,
          parameters: {
            isActive: true,
            yAxisSide: 'left'
          }
        },
        {
          id: 5,
          parameters: {
            isActive: true,
            yAxisSide: 'left'
          }
        }
      ]
    } as Widget;
  });


  it("min and max should be 0 if no data provided", () => {
    const viewCahce = new ViewCache(widget, context);
    const result = viewCahce.findMinAndMax([[], [], []], [0, 1, 2]);
    expect(result).toMatchObject({ min: 0, max: 0 });
  });

  it("min and max should be 0 if no layer indecies provided", () => {
    const layeredData = [
      [{ y: 3 }, { y: 2 }, { y: -5 }, null],
      [{ y: -1 }, { y: null }, { y: 10 }, { y: -30 }],
      [null, null, { y: -31 }]
    ];
    const viewCahce = new ViewCache(widget, context);
    const result = viewCahce.findMinAndMax(layeredData, []);
    expect(result).toMatchObject({ min: 0, max: 0 });
  });

  it("should find correct min and max values for all legends", () => {
    const layeredData = [
      [{ y: 3 }, { y: 2 }, { y: -5 }, null],
      [{ y: -1 }, { y: null }, { y: 10 }, { y: -30 }],
      [null, null, { y: -31 }]
    ];
    const viewCahce = new ViewCache(widget, context);
    const result = viewCahce.findMinAndMax(layeredData, [0, 1, 2]);
    expect(result).toMatchObject({ min: -31, max: 10 });
  });

  it("should find correct min and max values for part of legends", () => {
    const layeredData = [
      [{ y: 3 }, { y: 2 }, { y: -5 }, null],
      [{ y: -1 }, { y: null }, { y: 10 }, { y: -30 }],
      [null, null, { y: -31 }]
    ];
    const viewCahce = new ViewCache(widget, context);
    const result = viewCahce.findMinAndMax(layeredData, [0, 1]);
    expect(result).toMatchObject({ min: -30, max: 10 });
  })

  it("find min and max should skip inactive legends", () => {
    const layeredData = [
      [{ y: 3 }, { y: 2 }, { y: -5 }, null],
      [{ y: -1 }, { y: null }, { y: 10 }, { y: -30 }],
      [null, null, { y: -31 }]
    ];
    widget.legends[1].parameters.isActive = false;
    widget.legends[2].parameters.isActive = false;
    const viewCahce = new ViewCache(widget, context);
    const result = viewCahce.findMinAndMax(layeredData, [0, 1, 2]);
    expect(result).toMatchObject({ min: -5, max: 3 });
  })

  it("find min and max with stacked bar", () => {
    const layeredData = [
      [{ y: 3 }, { y: 2 }, { y: -5 }, { y: 3.54 }],
      [{ y: -1 }, { y: 1.54 }, { y: 10 }, { y: -2.4 }],
      [{ y: 1.4 }, { y: 2.22 }, { y: -3.1 }, { y: 2 }]
    ];
    widget.legends[0].parameters.chartType = ChartType.StackedBar;
    widget.legends[1].parameters.chartType = ChartType.StackedBar;
    widget.legends[2].parameters.chartType = ChartType.StackedBar;
    const viewCahce = new ViewCache(widget, context);
    const result = viewCahce.findMinAndMax(layeredData, [0, 1, 2]);
    expect(result).toMatchObject({ min: -8.1, max: 10 });
  })

  it("find min and max with bubble and tail point", () => {
    const layeredData = [
      [{ y: 3, tailPoint: 3.4 }, { y: 2, tailPoint: 1.3 }, { y: -5, tailPoint: -5.3 }, { y: 3.54, tailPoint: 4 }],
      [{ y: -1 }, { y: 1.54 }, { y: 10 }, { y: -2.4 }],
      [{ y: 1.4 }, { y: 2.22 }, { y: -3.1 }, { y: 2 }]
    ];
    widget.legends[0].parameters.chartType = ChartType.Bubble;
    const viewCahce = new ViewCache(widget, context);
    const result = viewCahce.findMinAndMax(layeredData, [0, 1, 2]);
    expect(result).toMatchObject({ min: -5.3, max: 10 });
  })

  it("find min and max with all chart types", () => {
    const layeredData = [
      [{ y: 3, tailPoint: 3.4 }, { y: 2, tailPoint: 1.3 }, { y: -5, tailPoint: -5.3 }, { y: 3.54, tailPoint: 4 }],
      [{ y: -1 }, { y: 1.54 }, { y: 10 }, { y: -2.4 }],
      [{ y: 1.4 }, { y: 2.22 }, { y: -3.1 }, { y: 2 }],
      [{ y: 2.3 }, { y: 3.40 }, { y: 0.50 }, { y: 4 }],
      [{ y: 4.44 }, { y: 0.225 }, { y: 4.89 }, { y: 0 }]
    ];
    widget.legends[0].parameters.chartType = ChartType.Bubble;
    widget.legends[1].parameters.chartType = ChartType.StackedBar;
    widget.legends[2].parameters.chartType = ChartType.Line;
    widget.legends[3].parameters.chartType = ChartType.StackedBar;
    widget.legends[4].parameters.chartType = ChartType.Line;
    const viewCahce = new ViewCache(widget, context);
    const result = viewCahce.findMinAndMax(layeredData, [0, 1, 2, 3, 4]);
    expect(result).toMatchObject({ min: -5.3, max: 10.5 });
  })

  it("initial domain should be set properly", () => {
    const viewCahce = new ViewCache(widget, context);
    expect(viewCahce.domains).toMatchObject({ left: { min: - 2, max: 6 }, right: { min: 0, max: 0 } });
  })

  it("domain should be updated after new data update", () => {
    const viewCahce = new ViewCache(widget, context);
    viewCahce.update([[{ y: 6 }], [{ y: 4 }], [{ y: 4 }], [{ y: -5 }], [{ y: 7 }]])
    expect(viewCahce.domains).toMatchObject({ left: { min: - 5, max: 7 }, right: { min: 0, max: 0 } });
  })
})
