import {
  AnnotationDataListing,
  AnnotationSorting,
  SortingOrder,
} from '../store/npmi_types';
import {stripMetricString} from './metric_type';

export function getSortedAnnotations(
  annotationData: AnnotationDataListing,
  sorting: AnnotationSorting
): string[] {
  let result = Object.keys(annotationData);
  const strippedMetric = stripMetricString(sorting.metric);
  if (sorting.metric === '') {
    return result;
  }
  if (sorting.order === SortingOrder.DOWN) {
    result = result.sort(function(a, b) {
      return (
        Math.max(
          ...annotationData[b]
            .filter((annotation) => annotation.metric === strippedMetric)
            .map((filtered) =>
              filtered.nPMIValue === null ? -Infinity : filtered.nPMIValue
            )
        ) -
        Math.max(
          ...annotationData[a]
            .filter((annotation) => annotation.metric === strippedMetric)
            .map((filtered) =>
              filtered.nPMIValue === null ? -Infinity : filtered.nPMIValue
            )
        )
      );
    });
  } else if (sorting.order === SortingOrder.UP) {
    result = result.sort(function(a, b) {
      return (
        Math.min(
          ...annotationData[a]
            .filter((annotation) => annotation.metric === strippedMetric)
            .map((filtered) =>
              filtered.nPMIValue === null ? Infinity : filtered.nPMIValue
            )
        ) -
        Math.min(
          ...annotationData[b]
            .filter((annotation) => annotation.metric === strippedMetric)
            .map((filtered) =>
              filtered.nPMIValue === null ? Infinity : filtered.nPMIValue
            )
        )
      );
    });
  }
  return result;
}
