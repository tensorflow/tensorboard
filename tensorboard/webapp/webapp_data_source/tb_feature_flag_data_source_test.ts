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
      it('returns default values when params are empty', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('')
        );
        expect(dataSource.getFeatures()).toEqual({
          enabledExperimentalPlugins: [],
          inColab: false,
          enableGpuChart: false,
        });
      });

      it('returns enabledExperimentalPlugins from the query params', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('experimentalPlugin=a&experimentalPlugin=b')
        );
        expect(dataSource.getFeatures().enabledExperimentalPlugins).toEqual([
          'a',
          'b',
        ]);
      });

      it('returns empty enabledExperimentalPlugins when empty', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('')
        );
        expect(dataSource.getFeatures().enabledExperimentalPlugins).toEqual([]);
      });

      it('returns isInColab when true', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('tensorboardColab=true')
        );
        expect(dataSource.getFeatures().inColab).toEqual(true);
      });

      it('returns isInColab when false', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('tensorboardColab=false')
        );
        expect(dataSource.getFeatures().inColab).toEqual(false);
      });

      it("returns enableGpuChart=false when 'fastChart' is empty", () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('fastChart=')
        );
        expect(dataSource.getFeatures().enableGpuChart).toEqual(false);
      });

      it('returns enableGpuChart=true when "true"', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('fastChart=true')
        );
        expect(dataSource.getFeatures().enableGpuChart).toEqual(true);
      });

      it('returns enableGpuChart=false when explicitly "false"', () => {
        spyOn(TEST_ONLY.util, 'getParams').and.returnValue(
          new URLSearchParams('fastChart=false')
        );
        expect(dataSource.getFeatures().enableGpuChart).toEqual(false);
      });
    });
  });
});
