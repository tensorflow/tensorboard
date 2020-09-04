import {ValueData, AnnotationDataListing} from '../store/npmi_types';

export type Coordinate = {
  runId: string;
  annotation: string;
  values: ValueData[];
};

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
    const allRuns = new Set(activeRuns);
    const allMetrics = new Set(activeMetrics);
    const runResult: {[runId: string]: ValueData[]} = {};
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
        extremeValues.max = Math.max(extremeValues.max, entry.nPMIValue);
        extremeValues.min = Math.min(extremeValues.min, entry.nPMIValue);
      } else {
        extremeValues.max = Math.max(extremeValues.max, 0);
        extremeValues.min = Math.min(extremeValues.min, 0);
      }
    });
    for (const key of Object.keys(runResult)) {
      result.push({
        annotation,
        runId: key,
        values: runResult[key],
      });
    }
  });
  return {coordinates: result, extremes: extremeValues};
}
