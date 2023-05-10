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
import {FeatureFlagMetadataMap} from '../feature_flag/store/feature_flag_metadata';
import {QueryParams} from './query_params';
import {
  FeatureFlagOverrideDataSource,
  TEST_ONLY,
} from './tb_feature_flag_data_source';

describe('tb_feature_flag_data_source', () => {
  describe('FeatureFlagOverrideDataSource', () => {
    let dataSource: FeatureFlagOverrideDataSource;
    let matchMediaSpy: jasmine.Spy;
    let getParamsSpy: jasmine.Spy;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        providers: [FeatureFlagOverrideDataSource, QueryParams],
      }).compileComponents();

      dataSource = TestBed.inject(FeatureFlagOverrideDataSource);
      matchMediaSpy = spyOn(window, 'matchMedia').and.returnValue({
        matches: false,
      } as MediaQueryList);

      getParamsSpy = spyOn(
        TestBed.inject(QueryParams),
        'getParams'
      ).and.returnValue(new URLSearchParams(''));
    });

    describe('getFeatures', () => {
      function getFeatures(options?: {
        enableMediaQuery?: boolean;
        localStorageOverrides?: string | null;
      }) {
        const {enableMediaQuery = false, localStorageOverrides = null} =
          options || {};
        spyOn(localStorage, 'getItem').and.returnValue(localStorageOverrides);
        return dataSource.getFeatures(enableMediaQuery, FeatureFlagMetadataMap);
      }

      it('returns empty values when params are empty', () => {
        getParamsSpy.and.returnValue(new URLSearchParams(''));
        expect(getFeatures()).toEqual({});
      });

      it('returns enabledExperimentalPlugins from the query params', () => {
        getParamsSpy.and.returnValue(
          new URLSearchParams('experimentalPlugin=a,b')
        );
        expect(getFeatures()).toEqual({
          enabledExperimentalPlugins: ['a', 'b'],
        });
      });

      it('returns inColab=true when `tensorboardColab` is empty', () => {
        getParamsSpy.and.returnValue(new URLSearchParams('tensorboardColab'));
        expect(getFeatures()).toEqual({inColab: true});
      });

      it('returns inColab=true when `tensorboardColab` is`true`', () => {
        getParamsSpy.and.returnValue(
          new URLSearchParams('tensorboardColab=true')
        );
        expect(getFeatures()).toEqual({inColab: true});
      });

      it('returns inColab=false when `tensorboardColab` is `false`', () => {
        getParamsSpy.and.returnValue(
          new URLSearchParams('tensorboardColab=false')
        );
        expect(getFeatures()).toEqual({inColab: false});
      });

      it('returns scalarsBatchSize from the query params', () => {
        getParamsSpy.and.returnValue(
          new URLSearchParams('scalarsBatchSize=12')
        );
        expect(getFeatures()).toEqual({
          scalarsBatchSize: 12,
        });
      });

      it('returns multiple flag values when they are all set', () => {
        getParamsSpy.and.returnValue(
          new URLSearchParams(
            'experimentalPlugin=a' +
              '&tensorboardColab' +
              '&scalarsBatchSize=16'
          )
        );
        expect(getFeatures()).toEqual({
          enabledExperimentalPlugins: ['a'],
          inColab: true,
          scalarsBatchSize: 16,
        });
      });

      describe('media query feature flag', () => {
        function fakeMediaQuery(matchDarkMode: boolean) {
          matchMediaSpy
            .withArgs(TEST_ONLY.DARK_MODE_MEDIA_QUERY)
            // MediaQueryList interface is hard to implement. Cheat.
            .and.returnValue({matches: matchDarkMode} as MediaQueryList);
        }

        it('takes value from media query when `enableMediaQuery` is true', () => {
          fakeMediaQuery(true);
          expect(getFeatures({enableMediaQuery: true})).toEqual({
            defaultEnableDarkMode: true,
          });
        });

        it(
          'does not return a feature flags when media query does not match ' +
            'dark mode',
          () => {
            fakeMediaQuery(false);
            expect(getFeatures({enableMediaQuery: true})).toEqual({});
          }
        );

        it('retrieves values from localStorage', () => {
          expect(
            getFeatures({localStorageOverrides: '{"inColab": true}'})
          ).toEqual({
            inColab: true,
          });
        });

        it('ignores features not contained within the provided FeatureFlagMetadataMap', () => {
          expect(
            getFeatures({localStorageOverrides: '{"abc123": true}'})
          ).toEqual({});
        });
      });
    });

    describe('persistFeatureFlags', () => {
      it('setsflag values', () => {
        spyOn(localStorage, 'getItem').and.returnValue(null);
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.persistFeatureFlags({forceSvg: true});

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key',
          '{"forceSvg":true}'
        );
      });

      it('adds new flag when some flags already exist', () => {
        spyOn(localStorage, 'getItem').and.returnValue('{"forceSvg":true}');

        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.persistFeatureFlags({inColab: true});

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key',
          '{"forceSvg":true,"inColab":true}'
        );
      });

      it('Overrides flag if it is already persisted', () => {
        spyOn(localStorage, 'getItem').and.returnValue(
          '{"forceSvg":true,"inColab":true}'
        );
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.persistFeatureFlags({inColab: false});

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key',
          '{"forceSvg":true,"inColab":false}'
        );
      });

      it('sets multiple flags when passed', () => {
        spyOn(localStorage, 'getItem').and.returnValue(null);
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.persistFeatureFlags({
          forceSvg: true,
          inColab: false,
        });

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key',
          '{"forceSvg":true,"inColab":false}'
        );
      });
    });

    describe('getPersistentFeatureFlags', () => {
      it('returns an empty object when localStorage returns null', () => {
        const getItemSpy = spyOn(localStorage, 'getItem').and.returnValue(null);

        expect(dataSource.getPersistentFeatureFlags()).toEqual({});
        expect(getItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key'
        );
      });

      it('returns a properly parsed object when getItem gives one', () => {
        const getItemSpy = spyOn(localStorage, 'getItem').and.returnValue(
          '{"forceSvg":true,"inColab":false}'
        );

        expect(dataSource.getPersistentFeatureFlags()).toEqual({
          forceSvg: true,
          inColab: false,
        });
        expect(getItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key'
        );
      });
    });

    describe('resetPersistedFeatureFlag', () => {
      it('does nothing if there is no flags are persisted', () => {
        spyOn(localStorage, 'getItem').and.returnValue(null);
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.resetPersistedFeatureFlag('inColab');

        expect(setItemSpy).not.toHaveBeenCalled();
      });

      it('does nothing when featureFlag passed is not persisted', () => {
        spyOn(localStorage, 'getItem').and.returnValue('{"forceSvg":true}');
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.resetPersistedFeatureFlag('inColab');

        expect(setItemSpy).not.toHaveBeenCalled();
      });

      it('stores a new object with given flag removed', () => {
        spyOn(localStorage, 'getItem').and.returnValue(
          '{"forceSvg":true,"inColab":false}'
        );
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.resetPersistedFeatureFlag('inColab');

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key',
          '{"forceSvg":true}'
        );
      });

      it('removes item when reseting the only flag', () => {
        spyOn(localStorage, 'getItem').and.returnValue('{"forceSvg":true}');
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();
        const removeItemSpy = spyOn(localStorage, 'removeItem').and.stub();

        dataSource.resetPersistedFeatureFlag('forceSvg');

        expect(setItemSpy).not.toHaveBeenCalled();
        expect(removeItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key'
        );
      });
    });

    describe('resetAllPersistedFeatureFlags', () => {
      it('removes entry from localStorage', () => {
        spyOn(localStorage, 'getItem').and.returnValue('{"forceSvg":true}');
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();
        const removeItemSpy = spyOn(localStorage, 'removeItem').and.stub();

        dataSource.resetAllPersistedFeatureFlags();
        expect(removeItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key'
        );
      });
    });
  });
});
