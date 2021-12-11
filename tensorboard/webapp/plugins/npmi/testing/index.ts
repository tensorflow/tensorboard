/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
import {
  DataLoadState,
  NpmiState,
  NPMI_FEATURE_KEY,
  SortOrder,
  State,
  ViewActive,
} from '../store/npmi_types';
import {buildEmbeddingDataSet} from '../util/umap';

export function createNpmiState(override?: Partial<NpmiState>): NpmiState {
  return {
    pluginDataLoaded: {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    },
    annotationData: {},
    embeddingDataSet: undefined,
    runToMetrics: {},
    selectedAnnotations: [],
    flaggedAnnotations: [],
    hiddenAnnotations: [],
    annotationsRegex: '',
    metricsRegex: '',
    metricArithmetic: [],
    metricFilters: {},
    sort: {
      metric: '',
      order: SortOrder.DESCENDING,
    },
    pcExpanded: true,
    annotationsExpanded: true,
    sidebarExpanded: true,
    showCounts: true,
    showHiddenAnnotations: false,
    viewActive: ViewActive.DEFAULT,
    sidebarWidth: 300,
    embeddingsMetric: '',
    embeddingsSidebarExpanded: true,
    embeddingsSidebarWidth: 500,
    ...override,
  };
}

export function createState(npmiState: NpmiState): State {
  return {[NPMI_FEATURE_KEY]: npmiState};
}

export function appStateFromNpmiState(metricsState?: NpmiState): State {
  return {
    [NPMI_FEATURE_KEY]: metricsState || createNpmiState(),
  };
}

export function buildSampleAnnotationData() {
  return {
    annotation_1: [
      {
        annotation: 'annotation_1',
        metric: 'test',
        run: 'run_1',
        nPMIValue: 0.5178,
        countValue: 100,
      },
      {
        annotation: 'annotation_1',
        metric: 'other',
        run: 'run_1',
        nPMIValue: 0.815,
        countValue: 100,
      },
      {
        annotation: 'annotation_1',
        metric: 'test',
        run: 'run_2',
        nPMIValue: 0.02157,
        countValue: 101,
      },
      {
        annotation: 'annotation_1',
        metric: 'other',
        run: 'run_2',
        nPMIValue: -0.02157,
        countValue: 101,
      },
      {
        annotation: 'annotation_1',
        metric: 'test',
        run: 'run_3',
        nPMIValue: -0.31,
        countValue: 53,
      },
      {
        annotation: 'annotation_1',
        metric: 'other',
        run: 'run_3',
        nPMIValue: -1.0,
        countValue: 53,
      },
    ],
    annotation_2: [
      {
        annotation: 'annotation_2',
        metric: 'test',
        run: 'run_1',
        nPMIValue: null,
        countValue: 572,
      },
      {
        annotation: 'annotation_2',
        metric: 'other',
        run: 'run_1',
        nPMIValue: -1.0,
        countValue: 53,
      },
    ],
    annotation_3: [
      {
        annotation: 'annotation_3',
        metric: 'test',
        run: 'run_1',
        nPMIValue: 0.757,
        countValue: 572,
      },
      {
        annotation: 'annotation3',
        metric: 'other',
        run: 'run_1',
        nPMIValue: 0.05,
        countValue: 53,
      },
      {
        annotation: 'annotation_3',
        metric: 'test',
        run: 'run_2',
        nPMIValue: -0.157,
        countValue: 572,
      },
      {
        annotation: 'annotation3',
        metric: 'other',
        run: 'run_2',
        nPMIValue: -0.05,
        countValue: 53,
      },
    ],
  };
}

export function createSampleEmbeddingData() {
  return buildEmbeddingDataSet(createSampleEmbeddingListing());
}

export function createSampleEmbeddingListing() {
  return {
    annotation_1: {
      vector: [0.5],
      name: 'annotation_1',
      index: 0,
    },
    annotation_2: {
      vector: [-0.2],
      name: 'annotation_2',
      index: 1,
    },
    annotation_3: {
      vector: [0.1],
      name: 'annotation_3',
      index: 2,
    },
  };
}
