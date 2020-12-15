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

import {
  QueryParamsFeatureFlagDataSource,
  TEST_ONLY,
} from './tb_feature_flag_data_source';

describe('tb_feature_flag_data_source', () => {
  describe('QueryParamsFeatureFlagDataSource', () => {
    let dataSource: QueryParamsFeatureFlagDataSource;
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        providers: [QueryParamsFeatureFlagDataSource],
      }).compileComponents();

      dataSource = TestBed.inject(QueryParamsFeatureFlagDataSource);
    });

    describe('getFeatures', () => {
      it('returns empy values when params are empty', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('')
        );
        expect(dataSource.getFeatures()).toEqual({});
      });

      it('returns enabledExperimentalPlugins from the query params', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('experimentalPlugin=a&experimentalPlugin=b')
        );
        expect(dataSource.getFeatures()).toEqual({
          enabledExperimentalPlugins: ['a', 'b'],
        });
      });

      it('returns inColab=false when `tensorboardColab` is empty', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('tensorboardColab')
        );
        expect(dataSource.getFeatures()).toEqual({inColab: false});
      });

      it('returns inColab=true when `tensorboardColab` is`true`', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('tensorboardColab=true')
        );
        expect(dataSource.getFeatures()).toEqual({inColab: true});
      });

      it('returns inColab=false when `tensorboardColab` is `false`', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('tensorboardColab=false')
        );
        expect(dataSource.getFeatures()).toEqual({inColab: false});
      });

      it('returns enableGpuChart=false when `fastChart` is empty', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('fastChart=')
        );
        expect(dataSource.getFeatures()).toEqual({enableGpuChart: false});
      });

      it('returns enableGpuChart=true when `fastChart` is `true`', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('fastChart=true')
        );
        expect(dataSource.getFeatures()).toEqual({enableGpuChart: true});
      });

      it('returns enableGpuChart=false when `fastChart` is "false"', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('fastChart=false')
        );
        expect(dataSource.getFeatures()).toEqual({enableGpuChart: false});
      });

      it('returns scalarsBatchSize from the query params', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('scalarsBatchSize=12')
        );
        expect(dataSource.getFeatures()).toEqual({
          scalarsBatchSize: 12,
        });
      });

      it('returns all flag values when they are all set', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams(
            'experimentalPlugin=a' +
              '&tensorboardColab' +
              '&fastChart=true' +
              '&scalarsBatchSize=16'
          )
        );
        expect(dataSource.getFeatures()).toEqual({
          enabledExperimentalPlugins: ['a'],
          inColab: false,
          enableGpuChart: true,
          scalarsBatchSize: 16,
        });
      });
    });
  });
});
