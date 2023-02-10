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
import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {State} from '../../app_state';
import {buildFeatureFlag} from '../../feature_flag/testing';
import * as selectors from '../../selectors';
import {provideMockTbStore} from '../../testing/utils';
import {
  HttpTestingController,
  TBHttpClientTestingModule,
} from '../../webapp_data_source/tb_http_client_testing';
import {
  BackendTagMetadata,
  BackendTimeSeriesResponse,
} from './metrics_backend_types';
import {TBMetricsDataSource} from './metrics_data_source';
import {MetricsDataSource, PluginType} from './types';

describe('TBMetricsDataSource test', () => {
  let httpMock: HttpTestingController;
  let dataSource: MetricsDataSource;
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [
        {provide: MetricsDataSource, useClass: TBMetricsDataSource},
        provideMockTbStore(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    dataSource = TestBed.inject(MetricsDataSource);
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(selectors.getFeatureFlags, buildFeatureFlag());
    store.overrideSelector(selectors.getIsFeatureFlagsLoaded, true);
    store.overrideSelector(selectors.getIsMetricsImageSupportEnabled, true);
  });

  afterEach(() => {
    httpMock.verify();
    store?.resetSelectors();
  });

  describe('fetchTagMetadata', () => {
    it('does not fetch when no experiment is passed', () => {
      const resultSpy = jasmine.createSpy();
      dataSource.fetchTagMetadata([]).subscribe(resultSpy);

      expect(resultSpy).not.toHaveBeenCalled();
    });

    it('removes image data when it is unsupported', () => {
      store.overrideSelector(selectors.getIsMetricsImageSupportEnabled, false);
      const resultSpy = jasmine.createSpy();
      dataSource.fetchTagMetadata(['exp1']).subscribe(resultSpy);

      const req = httpMock.expectOne(
        '/experiment/exp1/data/plugin/timeseries/tags'
      );
      const testResponse: BackendTagMetadata = {
        scalars: {tagDescriptions: {}, runTagInfo: {}},
        histograms: {tagDescriptions: {}, runTagInfo: {}},
        images: {
          tagDescriptions: {tag3: 'foo'},
          tagRunSampledInfo: {tag3: {run1: {maxSamplesPerStep: 1}}},
        },
      };
      req.flush(testResponse);

      expect(resultSpy).toHaveBeenCalledWith({
        scalars: {tagDescriptions: {}, runTagInfo: {}},
        histograms: {tagDescriptions: {}, runTagInfo: {}},
        images: {tagDescriptions: {}, tagRunSampledInfo: {}},
      });
    });

    it('converts run names to runIds', () => {
      const resultSpy = jasmine.createSpy();
      dataSource.fetchTagMetadata(['exp1']).subscribe(resultSpy);

      const req = httpMock.expectOne(
        '/experiment/exp1/data/plugin/timeseries/tags'
      );
      req.flush({
        scalars: {
          tagDescriptions: {},
          runTagInfo: {run1: ['tag1']},
        },
        histograms: {
          tagDescriptions: {},
          runTagInfo: {run1: ['tag2']},
        },
        images: {
          tagDescriptions: {},
          tagRunSampledInfo: {tag3: {run1: {maxSamplesPerStep: 1}}},
        },
      } as BackendTagMetadata);

      expect(resultSpy).toHaveBeenCalledWith({
        scalars: {
          tagDescriptions: {},
          runTagInfo: {'exp1/run1': ['tag1']},
        },
        histograms: {
          tagDescriptions: {},
          runTagInfo: {'exp1/run1': ['tag2']},
        },
        images: {
          tagDescriptions: {},
          tagRunSampledInfo: {tag3: {'exp1/run1': {maxSamplesPerStep: 1}}},
        },
      });
    });

    it('combines tag data from multiple experiments', () => {
      const resultSpy = jasmine.createSpy();
      dataSource.fetchTagMetadata(['exp1', 'exp2']).subscribe(resultSpy);

      const req1 = httpMock.expectOne(
        '/experiment/exp1/data/plugin/timeseries/tags'
      );
      req1.flush({
        scalars: {
          tagDescriptions: {tag1: 'tag1 is Foo'},
          runTagInfo: {run1: ['tag1']},
        },
        histograms: {
          tagDescriptions: {},
          runTagInfo: {run1: ['tag2']},
        },
        images: {
          tagDescriptions: {},
          tagRunSampledInfo: {tag3: {run1: {maxSamplesPerStep: 1}}},
        },
      } as BackendTagMetadata);

      const req2 = httpMock.expectOne(
        '/experiment/exp2/data/plugin/timeseries/tags'
      );
      req2.flush({
        scalars: {
          tagDescriptions: {tag1: 'tag1 is Bar'},
          runTagInfo: {run1: ['tag1']},
        },
        histograms: {
          tagDescriptions: {},
          runTagInfo: {run1: ['tag2']},
        },
        images: {
          tagDescriptions: {},
          tagRunSampledInfo: {
            tag3: {
              run1: {maxSamplesPerStep: 1},
              run2: {maxSamplesPerStep: 1},
            },
          },
        },
      } as BackendTagMetadata);

      expect(resultSpy).toHaveBeenCalledWith({
        scalars: {
          tagDescriptions: {tag1: 'tag1 is Bar'},
          runTagInfo: {'exp1/run1': ['tag1'], 'exp2/run1': ['tag1']},
        },
        histograms: {
          tagDescriptions: {},
          runTagInfo: {'exp1/run1': ['tag2'], 'exp2/run1': ['tag2']},
        },
        images: {
          tagDescriptions: {},
          tagRunSampledInfo: {
            tag3: {
              'exp1/run1': {maxSamplesPerStep: 1},
              'exp2/run1': {maxSamplesPerStep: 1},
              'exp2/run2': {maxSamplesPerStep: 1},
            },
          },
        },
      });
    });
  });

  describe('fetchTimeSeries', () => {
    it('does not fetch when no experiment is passed', () => {
      const resultSpy = jasmine.createSpy();
      dataSource.fetchTimeSeries([]).subscribe(resultSpy);

      expect(resultSpy).not.toHaveBeenCalled();
    });

    it('does not fetch when request has empty experiment ids', () => {
      const resultSpy = jasmine.createSpy();
      dataSource
        .fetchTimeSeries([
          {
            plugin: PluginType.SCALARS,
            tag: 'tag1',
            experimentIds: [],
          },
        ])
        .subscribe(resultSpy);

      expect(resultSpy).not.toHaveBeenCalled();
    });

    it('makes requests per experiment id', () => {
      const resultSpy = jasmine.createSpy();
      dataSource
        .fetchTimeSeries([
          {
            plugin: PluginType.SCALARS,
            tag: 'tag1',
            experimentIds: ['exp1', 'exp2'],
          },
        ])
        .subscribe(resultSpy);

      const req1 = httpMock.expectOne(
        '/experiment/exp1/data/plugin/timeseries/timeSeries'
      );
      req1.flush([
        {
          plugin: PluginType.SCALARS,
          tag: 'tag1',
          runToSeries: {run1: []},
        },
      ] as BackendTimeSeriesResponse[]);

      const req2 = httpMock.expectOne(
        '/experiment/exp2/data/plugin/timeseries/timeSeries'
      );
      req2.flush([
        {
          plugin: PluginType.SCALARS,
          tag: 'tag1',
          runToSeries: {run1: []},
        },
      ] as BackendTimeSeriesResponse[]);

      expect(resultSpy).toHaveBeenCalledWith([
        {
          plugin: PluginType.SCALARS,
          tag: 'tag1',
          runToSeries: {'exp1/run1': [], 'exp2/run1': []},
        },
      ]);
    });

    it('drops series data if one experiment had an error', () => {
      const resultSpy = jasmine.createSpy();
      dataSource
        .fetchTimeSeries([
          {
            plugin: PluginType.SCALARS,
            tag: 'tag1',
            experimentIds: ['exp1', 'exp2'],
          },
        ])
        .subscribe(resultSpy);

      const req1 = httpMock.expectOne(
        '/experiment/exp1/data/plugin/timeseries/timeSeries'
      );
      req1.flush([
        {
          plugin: PluginType.SCALARS,
          tag: 'tag1',
          error: 'Something bad happened',
        },
      ] as BackendTimeSeriesResponse[]);

      const req2 = httpMock.expectOne(
        '/experiment/exp2/data/plugin/timeseries/timeSeries'
      );
      req2.flush([
        {
          plugin: PluginType.SCALARS,
          tag: 'tag1',
          runToSeries: {run1: []},
        },
      ] as BackendTimeSeriesResponse[]);

      expect(resultSpy).toHaveBeenCalledWith([
        {
          plugin: PluginType.SCALARS,
          tag: 'tag1',
          error: 'Something bad happened',
          runToSeries: undefined,
        },
      ]);
    });

    it('makes single-run requests', () => {
      const resultSpy = jasmine.createSpy();
      dataSource
        .fetchTimeSeries([
          {
            plugin: PluginType.HISTOGRAMS,
            tag: 'tag1',
            runId: 'exp1/run1',
          },
        ])
        .subscribe(resultSpy);

      const req1 = httpMock.expectOne(
        '/experiment/exp1/data/plugin/timeseries/timeSeries'
      );
      req1.flush([
        {
          plugin: PluginType.HISTOGRAMS,
          tag: 'tag1',
          runToSeries: {run1: []},
        },
      ] as BackendTimeSeriesResponse[]);

      expect(resultSpy).toHaveBeenCalledWith([
        {
          plugin: PluginType.HISTOGRAMS,
          tag: 'tag1',
          runToSeries: {'exp1/run1': []},
        },
      ]);
    });
  });

  describe('#downloadUrl', () => {
    it('forms correct Url', () => {
      expect(
        dataSource.downloadUrl(PluginType.SCALARS, 'tag1', 'exp1/run1', 'json')
      ).toBe(
        '/experiment/exp1/data/plugin/scalars/scalars?tag=tag1&run=run1&format=json'
      );
      expect(
        dataSource.downloadUrl(PluginType.SCALARS, 'tag1', 'exp1/run1', 'csv')
      ).toBe(
        '/experiment/exp1/data/plugin/scalars/scalars?tag=tag1&run=run1&format=csv'
      );
      expect(
        dataSource.downloadUrl(PluginType.SCALARS, 'tag1', 'e2/run1', 'json')
      ).toBe(
        '/experiment/e2/data/plugin/scalars/scalars?tag=tag1&run=run1&format=json'
      );
      expect(
        dataSource.downloadUrl(PluginType.SCALARS, 'tag1', 'e2/run1', 'csv')
      ).toBe(
        '/experiment/e2/data/plugin/scalars/scalars?tag=tag1&run=run1&format=csv'
      );
    });

    it('throws for histogram data type', () => {
      expect(() =>
        dataSource.downloadUrl(PluginType.HISTOGRAMS, 'tag1', 'e/r', 'json')
      ).toThrowError(/Not implemented/);
    });

    it('throws when experiment id is missing', () => {
      expect(() =>
        dataSource.downloadUrl(PluginType.SCALARS, 'tag1', 'run1', 'json')
      ).toThrowError(/experimentId is empty/);
    });
  });
});
