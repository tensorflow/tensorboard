import {ValueData, AnnotationDataListing} from '../store/npmi_types';

export type Coordinate = {[runId: string]: ValueData[]};

export function coordinateData(
  annotationData: AnnotationDataListing,
  selectedAnnotations: string[],
  activeRuns: string[],
  activeMetrics: string[]
): {coordinates: Coordinate[]; extremes: {min: number; max: number}} {
  const result: Coordinate[] = [];
  const extremeValues = {max: -1.0, min: 1.0};
  selectedAnnotations.forEach((annotation) => {
    const data = annotationData[annotation];
    const allRuns = new Set(...activeRuns);
    const allMetrics = new Set(...activeMetrics);
    const runResult: Coordinate = {};
    data.forEach((entry) => {
      if (!allRuns.has(entry.run) || !allMetrics.has(entry.metric)) {
        return;
      }
      if (runResult[entry.run]) {
        runResult[entry.run].push(entry);
      } else {
        runResult[entry.run] = [entry];
      }
      if (entry.nPMIValue !== null) {
        extremeValues.max =
          extremeValues.max < entry.nPMIValue
            ? entry.nPMIValue
            : extremeValues.max;
        extremeValues.min =
          extremeValues.min > entry.nPMIValue
            ? entry.nPMIValue
            : extremeValues.min;
      }
    });
    if (Object.keys(runResult).length > 0) {
      result.push(runResult);
    }
  });
  return {coordinates: result, extremes: extremeValues};
}
