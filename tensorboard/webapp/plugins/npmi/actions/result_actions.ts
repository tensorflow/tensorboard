import {createAction, props} from '@ngrx/store';
import {ValueListing, MetricListing} from '../store/npmi_types';

// HACK: Below import is for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';

export const valuesRequested = createAction(
  '[NPMI] nPMI Values Requested'
);

export const valuesLoaded = createAction(
  '[NPMI] nPMI Values Loaded',
  props<{values: ValueListing, metrics: MetricListing}>(),
);

export const valuesRequestFailed = createAction(
  '[NPMI] nPMI Values Request Failed'
);
