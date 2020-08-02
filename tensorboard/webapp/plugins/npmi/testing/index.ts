import {
  NpmiState,
  DataLoadState,
  NPMI_FEATURE_KEY,
  State,
} from '../store/npmi_types';

export function createNpmiState(override?: Partial<NpmiState>): NpmiState {
  return {
    annotationsData: {},
    annotationsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    metricsData: {},
    countMetricsData: {},
    npmiMetricsData: {},
    metricsLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    valuesData: {},
    countValuesData: {},
    npmiValuesData: {},
    valuesLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    countData: {},
    ...override,
  };
}

export function createState(npmiState: NpmiState): State {
  return {[NPMI_FEATURE_KEY]: npmiState};
}
