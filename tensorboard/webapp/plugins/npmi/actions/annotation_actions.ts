import {createAction, props} from '@ngrx/store';
import {AnnotationListing, AnnotationSorting} from '../store/npmi_types';

// HACK: Below import is for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';

export const annotationsRequested = createAction(
  '[NPMI] nPMI Annotations Requested'
);

export const annotationsLoaded = createAction(
  '[NPMI] nPMI Annotations Loaded',
  props<{annotations: AnnotationListing}>()
);

export const annotationsRequestFailed = createAction(
  '[NPMI] nPMI Annotations Request Failed'
);
