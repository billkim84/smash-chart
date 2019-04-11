import { DataCahce } from "../src/data/data-cache";
import { SmashChart } from "../src/smash-chart";

describe("DataCache test", () => {

  it("min and max should be 0 if no data provided", () => {
    const testData = generateData(5, 30);
    const expectedData = generateData(5, 10);
    const dataCache = new DataCahce(testData, { state: { viewSize: 10, viewStartIndex: 0 } } as SmashChart)
    const viewData = dataCache.getCurrentViewData();
    expect(JSON.stringify(viewData)).toBe(JSON.stringify(expectedData));
    expect(JSON.stringify(dataCache.cache)).toBe(JSON.stringify(testData));
  });

});

function generateData(numberOfLayers: number, numberOfData: number) {
  const data = [];
  for (let i = 0; i < numberOfLayers; i++) {
    const dataLayer = [];
    for (let j = 0; j < numberOfData; j++) {
      dataLayer.push((i + 1) * (j + 1));
    }
    data.push(dataLayer);
  }
  return data;
}
