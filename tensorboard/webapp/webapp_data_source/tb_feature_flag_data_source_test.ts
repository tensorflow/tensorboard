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
      it('returns empty values when params are empty', () => {
        getParamsSpy.and.returnValue(new URLSearchParams(''));
        expect(dataSource.getFeatures()).toEqual({});
      });

      it('returns enabledExperimentalPlugins from the query params', () => {
        getParamsSpy.and.returnValue(
          new URLSearchParams('experimentalPlugin=a,b')
        );
        expect(dataSource.getFeatures()).toEqual({
          enabledExperimentalPlugins: ['a', 'b'],
        });
      });

      it('returns inColab=false when `tensorboardColab` is empty', () => {
        getParamsSpy.and.returnValue(new URLSearchParams('tensorboardColab'));
        expect(dataSource.getFeatures()).toEqual({inColab: true});
      });

      it('returns inColab=true when `tensorboardColab` is`true`', () => {
        getParamsSpy.and.returnValue(
          new URLSearchParams('tensorboardColab=true')
        );
        expect(dataSource.getFeatures()).toEqual({inColab: true});
      });

      it('returns inColab=false when `tensorboardColab` is `false`', () => {
        getParamsSpy.and.returnValue(
          new URLSearchParams('tensorboardColab=false')
        );
        expect(dataSource.getFeatures()).toEqual({inColab: false});
      });

      it('returns scalarsBatchSize from the query params', () => {
        getParamsSpy.and.returnValue(
          new URLSearchParams('scalarsBatchSize=12')
        );
        expect(dataSource.getFeatures()).toEqual({
          scalarsBatchSize: 12,
        });
      });

      describe('returns enableColorGroup from the query params', () => {
        it('when set to false', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableColorGroup=false')
          );
          expect(dataSource.getFeatures()).toEqual({enabledColorGroup: false});
        });

        it('when set to empty string', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableColorGroup=')
          );
          expect(dataSource.getFeatures()).toEqual({enabledColorGroup: true});
        });

        it('when set to true', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableColorGroup=true')
          );
          expect(dataSource.getFeatures()).toEqual({enabledColorGroup: true});
        });

        it('when set to an arbitrary string', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableColorGroup=foo')
          );
          expect(dataSource.getFeatures()).toEqual({enabledColorGroup: true});
        });
      });

      describe('returns enabledColorGroupByRegex from the query params', () => {
        it('when set to false', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableColorGroupByRegex=false')
          );
          expect(dataSource.getFeatures()).toEqual({
            enabledColorGroupByRegex: false,
          });
        });

        it('when set to empty string', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableColorGroupByRegex=')
          );
          expect(dataSource.getFeatures()).toEqual({
            enabledColorGroupByRegex: true,
          });
        });

        it('when set to true', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableColorGroupByRegex=true')
          );
          expect(dataSource.getFeatures()).toEqual({
            enabledColorGroupByRegex: true,
          });
        });

        it('when set to an arbitrary string', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableColorGroupByRegex=foo')
          );
          expect(dataSource.getFeatures()).toEqual({
            enabledColorGroupByRegex: true,
          });
        });
      });

      describe('returns enabledLinkedTime from the query params', () => {
        it('when set to false', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableLinkedTime=false')
          );
          expect(dataSource.getFeatures()).toEqual({enabledLinkedTime: false});
        });

        it('when set to empty string', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableLinkedTime=')
          );
          expect(dataSource.getFeatures()).toEqual({enabledLinkedTime: true});
        });

        it('when set to true', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableLinkedTime=true')
          );
          expect(dataSource.getFeatures()).toEqual({enabledLinkedTime: true});
        });

        it('when set to an arbitrary string', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableLinkedTime=foo')
          );
          expect(dataSource.getFeatures()).toEqual({enabledLinkedTime: true});
        });
      });

      describe('returns forceSvg from the query params', () => {
        it('when set to false', () => {
          getParamsSpy.and.returnValue(new URLSearchParams('forceSVG=false'));
          expect(dataSource.getFeatures()).toEqual({forceSvg: false});
        });

        it('when set to empty string', () => {
          getParamsSpy.and.returnValue(new URLSearchParams('forceSVG='));
          expect(dataSource.getFeatures()).toEqual({forceSvg: true});
        });

        it('when set to true', () => {
          getParamsSpy.and.returnValue(new URLSearchParams('forceSVG=true'));
          expect(dataSource.getFeatures()).toEqual({forceSvg: true});
        });

        it('when set to an arbitrary string', () => {
          getParamsSpy.and.returnValue(new URLSearchParams('forceSVG=foo'));
          expect(dataSource.getFeatures()).toEqual({forceSvg: true});
        });
      });

      describe('returns enabledDataTable from the query params', () => {
        it('when set to false', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableDataTable=false')
          );
          expect(dataSource.getFeatures()).toEqual({
            enabledScalarDataTable: false,
          });
        });

        it('when set to empty string', () => {
          getParamsSpy.and.returnValue(new URLSearchParams('enableDataTable='));
          expect(dataSource.getFeatures()).toEqual({
            enabledScalarDataTable: true,
          });
        });

        it('when set to true', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableDataTable=true')
          );
          expect(dataSource.getFeatures()).toEqual({
            enabledScalarDataTable: true,
          });
        });

        it('when set to an arbitrary string', () => {
          getParamsSpy.and.returnValue(
            new URLSearchParams('enableDataTable=foo')
          );
          expect(dataSource.getFeatures()).toEqual({
            enabledScalarDataTable: true,
          });
        });
      });

      it('returns all flag values when they are all set', () => {
        getParamsSpy.and.returnValue(
          new URLSearchParams(
            'experimentalPlugin=a' +
              '&tensorboardColab' +
              '&fastChart=true' +
              '&scalarsBatchSize=16'
          )
        );
        expect(dataSource.getFeatures()).toEqual({
          enabledExperimentalPlugins: ['a'],
          inColab: true,
          scalarsBatchSize: 16,
        });
      });
    });

    describe('media query feature flag', () => {
      describe('getFeatures', () => {
        function fakeMediaQuery(matchDarkMode: boolean) {
          matchMediaSpy
            .withArgs(TEST_ONLY.DARK_MODE_MEDIA_QUERY)
            // MediaQueryList interface is hard to implement. Cheat.
            .and.returnValue({matches: matchDarkMode} as MediaQueryList);
        }

        it('takes value from media query when `enableMediaQuery` is true', () => {
          fakeMediaQuery(true);
          expect(dataSource.getFeatures(true)).toEqual({
            defaultEnableDarkMode: true,
          });
        });

        it(
          'does not return a feature flags when media query does not match ' +
            'dark mode',
          () => {
            fakeMediaQuery(false);
            expect(dataSource.getFeatures(true)).toEqual({});
          }
        );
      });
    });

    describe('persistFeatureFlags', () => {
      it('setsflag values', () => {
        spyOn(localStorage, 'getItem').and.returnValue(null);
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.persistFeatureFlags({enabledScalarDataTable: true});

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key',
          '{"enabledScalarDataTable":true}'
        );
      });

      it('adds new flag when some flags already exist', () => {
        spyOn(localStorage, 'getItem').and.returnValue(
          '{"enabledScalarDataTable":true}'
        );

        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.persistFeatureFlags({enableTimeSeriesPromotion: true});

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key',
          '{"enabledScalarDataTable":true,"enableTimeSeriesPromotion":true}'
        );
      });

      it('Overrides flag if it is already persisted', () => {
        spyOn(localStorage, 'getItem').and.returnValue(
          '{"enabledScalarDataTable":true,"enableTimeSeriesPromotion":true}'
        );
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.persistFeatureFlags({enableTimeSeriesPromotion: false});

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key',
          '{"enabledScalarDataTable":true,"enableTimeSeriesPromotion":false}'
        );
      });

      it('sets multiple flags when passed', () => {
        spyOn(localStorage, 'getItem').and.returnValue(null);
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.persistFeatureFlags({
          enabledScalarDataTable: true,
          enableTimeSeriesPromotion: false,
        });

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key',
          '{"enabledScalarDataTable":true,"enableTimeSeriesPromotion":false}'
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
          '{"enabledScalarDataTable":true,"enableTimeSeriesPromotion":false}'
        );

        expect(dataSource.getPersistentFeatureFlags()).toEqual({
          enabledScalarDataTable: true,
          enableTimeSeriesPromotion: false,
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

        dataSource.resetPersistedFeatureFlag('enableTimeSeriesPromotion');

        expect(setItemSpy).not.toHaveBeenCalled();
      });

      it('does nothing when featureFlag passed is not persisted', () => {
        spyOn(localStorage, 'getItem').and.returnValue(
          '{"enabledScalarDataTable":true}'
        );
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.resetPersistedFeatureFlag('enableTimeSeriesPromotion');

        expect(setItemSpy).not.toHaveBeenCalled();
      });

      it('stores a new object with given flag removed', () => {
        spyOn(localStorage, 'getItem').and.returnValue(
          '{"enabledScalarDataTable":true,"enableTimeSeriesPromotion":false}'
        );
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();

        dataSource.resetPersistedFeatureFlag('enableTimeSeriesPromotion');

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key',
          '{"enabledScalarDataTable":true}'
        );
      });

      it('removes item when reseting the only flag', () => {
        spyOn(localStorage, 'getItem').and.returnValue(
          '{"enabledScalarDataTable":true}'
        );
        const setItemSpy = spyOn(localStorage, 'setItem').and.stub();
        const removeItemSpy = spyOn(localStorage, 'removeItem').and.stub();

        dataSource.resetPersistedFeatureFlag('enabledScalarDataTable');

        expect(setItemSpy).not.toHaveBeenCalled();
        expect(removeItemSpy).toHaveBeenCalledOnceWith(
          'tb_feature_flag_storage_key'
        );
      });
    });
  });
});
