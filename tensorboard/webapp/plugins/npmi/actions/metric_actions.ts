import {createAction, props} from '@ngrx/store';
import {MetricListing} from '../store/npmi_types';

// HACK: Below import is for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';

export const metricsRequested = createAction('[NPMI] nPMI Metrics Requested');

export const metricsLoaded = createAction(
  '[NPMI] nPMI Metrics Loaded',
  props<{metrics: MetricListing}>()
);

export const metricsRequestFailed = createAction(
  '[NPMI] nPMI Metrics Request Failed'
);
