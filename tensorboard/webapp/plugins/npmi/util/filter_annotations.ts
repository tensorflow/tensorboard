import {
  AnnotationDataListing,
  ArithmeticElement,
  MetricFilterListing,
  ValueData,
  Annotation,
} from './../store/npmi_types';
import {stripMetricString} from './metric_type';

export function filterAnnotations(
  annotationData: AnnotationDataListing,
  activeRuns: string[],
  metricArithmetic: ArithmeticElement[],
  metricFilters: MetricFilterListing,
  metrics: string[]
): AnnotationDataListing {
  const data: AnnotationDataListing = {};
  const annotations = Object.keys(annotationData);
  annotations.map((annotation) => {
    let valueDataElements = annotationData[annotation];
    const allMetrics = metrics.map((metric) => stripMetricString(metric));
    // Remove all inactive runs and keep only metrics currently displayed
    valueDataElements = valueDataElements.filter((valueDataElement) => {
      return (
        activeRuns.includes(valueDataElement.run) &&
        allMetrics.includes(valueDataElement.metric)
      );
    });
    let include = true;
    // Check all parts of the arithemetic
    for (const element of metricArithmetic) {
      if (element.kind === 'metric') {
        const metricFilter = metricFilters[element.metric];
        include =
          include &&
          valueDataElements.some((valueDataElement) => {
            if (stripMetricString(valueDataElement.metric) === element.metric) {
              if (!valueDataElement.nPMIValue && metricFilter.includeNaN) {
                return true;
              } else {
                return (
                  valueDataElement.nPMIValue! <= metricFilter.max &&
                  valueDataElement.nPMIValue! >= metricFilter.min
                );
              }
            }
            return false;
          });
      }
    }
    if (include) {
      data[annotation] = valueDataElements;
    }
  });
  return data;
}

export function removeHiddenAnnotations(
  annotationData: AnnotationDataListing,
  hiddenAnnotations: string[],
  removeHidden: boolean
): AnnotationDataListing {
  if (!removeHidden) {
    return annotationData;
  }
  const data = annotationData;
  hiddenAnnotations.forEach((annotation) => delete data[annotation]);
  return data;
}
