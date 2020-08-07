export function metricIsCount(metric: string): boolean {
  return metric.startsWith('count');
}

export function metricIsMetricCount(metric: string): boolean {
  return metric.startsWith('count@');
}

export function metricIsNpmi(metric: string): boolean {
  return metric.startsWith('nPMI');
}
