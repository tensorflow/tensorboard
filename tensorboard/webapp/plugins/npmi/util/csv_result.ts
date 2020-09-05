import {ValueData} from '../store/npmi_types';
import {stripMetricString} from './metric_type';

export function convertToCSVResult(
  flaggedData: [string, ValueData[]][],
  run: string,
  metrics: string[]
): string[][] {
  const result = [[run, ...metrics]];
  if (metrics.length === 0 || flaggedData.length === 0) {
    return result;
  }
  const strippedMetrics = metrics.map((metric) => stripMetricString(metric));
  for (const element of flaggedData) {
    const runValues = element[1].filter((values) => values.run === run);
    if (runValues.length > 0) {
      const elementResult = [element[0]];
      for (const metric of strippedMetrics) {
        const metricValue = runValues.find((value) => value.metric === metric);
        if (metricValue === undefined) {
          elementResult.push('null');
        } else {
          elementResult.push(`${metricValue.nPMIValue}`);
        }
      }
      result.push(elementResult);
    }
  }
  return result;
}
