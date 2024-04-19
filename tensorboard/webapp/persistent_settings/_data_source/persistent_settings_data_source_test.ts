/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {Injectable} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {firstValueFrom} from 'rxjs';
import {TooltipSort} from '../../metrics/types';
import {ColumnHeaderType} from '../../widgets/data_table/types';
import {
  OSSSettingsConverter,
  PersistentSettingsDataSourceImpl,
  SettingsConverter,
  TEST_ONLY,
} from './persistent_settings_data_source';
import {BackendSettings, PersistableSettings, ThemeValue} from './types';

describe('persistent_settings data_source test', () => {
  let getItemSpy: jasmine.Spy;
  let setItemSpy: jasmine.Spy;

  async function configure<UiSettings, StorageSettings>(
    Converter: new () => SettingsConverter<UiSettings, StorageSettings>
  ) {
    await TestBed.configureTestingModule({
      providers: [
        PersistentSettingsDataSourceImpl,
        {provide: SettingsConverter, useClass: Converter},
      ],
    });

    getItemSpy = spyOn(window.localStorage, 'getItem').and.stub();
    setItemSpy = spyOn(window.localStorage, 'setItem').and.stub();
    return TestBed.inject(PersistentSettingsDataSourceImpl);
  }

  describe('oss impl', () => {
    let dataSource: PersistentSettingsDataSourceImpl<
      PersistableSettings,
      BackendSettings
    >;

    beforeEach(async () => {
      dataSource = await configure(OSSSettingsConverter);
    });

    describe('#getSettings', () => {
      it('gets setting from the local storage', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            scalarSmoothing: 0.3,
            notificationLastReadTimeInMs: 5,
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          scalarSmoothing: 0.3,
          notificationLastReadTimeInMs: 5,
        });
      });

      it('returns empty object when nothing is written', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.LEGACY_METRICS_LOCAL_STORAGE_KEY)
          .and.returnValue(null)
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue(null);

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({});
      });

      it('disregards unrelated info if setting prop key is not known', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue(
            '{"foo": "bar", "scalarSmoothing": 0.3, "timeSeriesCardMinWidth": 500}'
          );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          scalarSmoothing: 0.3,
          timeSeriesCardMinWidth: 500,
        });
      });

      it('gets settings related props from local storage', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            autoReload: false,
            autoReloadPeriodInMs: -1,
            paginationSize: 1000,
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          autoReload: false,
          autoReloadPeriodInMs: -1,
          pageSize: 1000,
        });
      });

      it('discards value if it does not match the type information in settings', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            autoReload: 'false',
            autoReloadPeriodInMs: '10',
            paginationSize: true,
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({});
      });

      it('grabs theme value if it matches known enum', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValues('{"theme": "yolo"}', '{"theme": "dark"}');

        const actual1 = await firstValueFrom(dataSource.getSettings());
        expect(actual1).toEqual({});

        const actual2 = await firstValueFrom(dataSource.getSettings());
        expect(actual2).toEqual({
          themeOverride: ThemeValue.DARK,
        });
      });

      it('properly converts stepSelectorEnabled', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            stepSelectorEnabled: true,
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          stepSelectorEnabled: true,
        });
      });
      it('properly converts rangeSelectionEnabled', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            rangeSelectionEnabled: true,
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          rangeSelectionEnabled: true,
        });
      });
      it('properly converts linkedTimeEnabled', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            linkedTimeEnabled: true,
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          linkedTimeEnabled: true,
        });
      });
      it('properly converts singleSelectionHeaders', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            singleSelectionHeaders: [
              {
                type: ColumnHeaderType.RUN,
                name: 'run',
                displayName: 'Run',
                enabled: true,
              },
              {
                type: ColumnHeaderType.VALUE,
                name: 'value',
                displayName: 'Value',
                enabled: false,
              },
            ],
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          singleSelectionHeaders: [
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
              removable: false,
              sortable: true,
              movable: false,
            },
            {
              type: ColumnHeaderType.VALUE,
              name: 'value',
              displayName: 'Value',
              enabled: false,
              removable: true,
              sortable: true,
              movable: true,
            },
          ],
        });
      });

      it('properly converts rangeSelectionHeaders', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            rangeSelectionHeaders: [
              {
                type: ColumnHeaderType.RUN,
                name: 'run',
                displayName: 'Run',
                enabled: true,
              },
              {
                type: ColumnHeaderType.MIN_VALUE,
                name: 'minValue',
                displayName: 'Min',
                enabled: false,
              },
            ],
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          rangeSelectionHeaders: [
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
              removable: false,
              sortable: true,
              movable: false,
            },
            {
              type: ColumnHeaderType.MIN_VALUE,
              name: 'minValue',
              displayName: 'Min',
              enabled: false,
              removable: true,
              sortable: true,
              movable: true,
            },
          ],
        });
      });

      it('resets singleSelectionEnabled if old ColumnHeader is stored', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            singleSelectionHeaders: [
              {
                type: ColumnHeaderType.RUN,
                enabled: true,
              },
              {
                type: ColumnHeaderType.VALUE,
                enabled: false,
              },
            ],
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({});
      });

      it('resets singleSelectionEnabled if runs header is not first', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            singleSelectionHeaders: [
              {
                type: ColumnHeaderType.VALUE,
                enabled: false,
              },
              {
                type: ColumnHeaderType.RUN,
                enabled: true,
              },
            ],
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({});
      });

      it('resets rangeSelectionEnabled if old ColumnHeader is stored', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            rangeSelectionHeaders: [
              {
                type: ColumnHeaderType.RUN,
                enabled: true,
              },
              {
                type: ColumnHeaderType.MIN_VALUE,
                enabled: true,
              },
            ],
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({});
      });

      it('resets rangeSelectionEnabled if runs header is not first', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            rangeSelectionHeaders: [
              {
                type: ColumnHeaderType.MIN_VALUE,
                enabled: true,
              },
              {
                type: ColumnHeaderType.RUN,
                enabled: true,
              },
            ],
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({});
      });

      it('properly converts dashboardDisplayedHparamColumns', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            dashboardDisplayedHparamColumns: [
              {
                type: ColumnHeaderType.HPARAM,
                name: 'conv_layers',
                displayName: 'Conv Layers',
                enabled: true,
              },
              {
                type: ColumnHeaderType.HPARAM,
                name: 'conv_kernel_size',
                displayName: 'Conv Kernel Size',
                enabled: true,
              },
            ],
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          dashboardDisplayedHparamColumns: [
            {
              type: ColumnHeaderType.HPARAM,
              name: 'conv_layers',
              displayName: 'Conv Layers',
              enabled: true,
            },
            {
              type: ColumnHeaderType.HPARAM,
              name: 'conv_kernel_size',
              displayName: 'Conv Kernel Size',
              enabled: true,
            },
          ],
        });
      });

      it('properly converts savingPinsEnabled', async () => {
        getItemSpy.withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY).and.returnValue(
          JSON.stringify({
            savingPinsEnabled: false,
          })
        );

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          savingPinsEnabled: false,
        });
      });
    });

    describe('#setSettings', () => {
      it('sets settings', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue(
            '{"scalarSmoothing": 0.3, "ignoreOutliers": false, "timeSeriesCardMinWidth": 360}'
          );

        await firstValueFrom(
          dataSource.setSettings({
            scalarSmoothing: 0.5,
            timeSeriesCardMinWidth: 360,
          })
        );

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY,
          JSON.stringify({
            ignoreOutliers: false,
            scalarSmoothing: 0.5,
            timeSeriesCardMinWidth: 360,
          })
        );
      });

      it('properly converts stepSelectorEnabled', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue(null);

        await firstValueFrom(
          dataSource.setSettings({
            stepSelectorEnabled: true,
          })
        );

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY,
          JSON.stringify({
            stepSelectorEnabled: true,
          })
        );
      });

      it('properly converts rangeSelectionEnabled', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue(null);

        await firstValueFrom(
          dataSource.setSettings({
            rangeSelectionEnabled: true,
          })
        );

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY,
          JSON.stringify({
            rangeSelectionEnabled: true,
          })
        );
      });

      it('properly converts linkedTimeEnabled', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue(null);

        await firstValueFrom(
          dataSource.setSettings({
            linkedTimeEnabled: true,
          })
        );

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY,
          JSON.stringify({
            linkedTimeEnabled: true,
          })
        );
      });

      it('properly converts dashboardDisplayedHparamColumns', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue(null);

        await firstValueFrom(
          dataSource.setSettings({
            dashboardDisplayedHparamColumns: [
              {
                type: ColumnHeaderType.HPARAM,
                name: 'conv_layers',
                displayName: 'Conv Layers',
                enabled: true,
              },
              {
                type: ColumnHeaderType.HPARAM,
                name: 'conv_kernel_size',
                displayName: 'Conv Kernel Size',
                enabled: true,
              },
            ],
          })
        );

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY,
          JSON.stringify({
            dashboardDisplayedHparamColumns: [
              {
                type: ColumnHeaderType.HPARAM,
                name: 'conv_layers',
                displayName: 'Conv Layers',
                enabled: true,
              },
              {
                type: ColumnHeaderType.HPARAM,
                name: 'conv_kernel_size',
                displayName: 'Conv Kernel Size',
                enabled: true,
              },
            ],
          })
        );
      });

      it('properly converts savingPinsEnabled', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue(null);

        await firstValueFrom(
          dataSource.setSettings({
            savingPinsEnabled: false,
          })
        );

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY,
          JSON.stringify({
            savingPinsEnabled: false,
          })
        );
      });
    });

    describe('settings migration', () => {
      let removeItemSpy: jasmine.Spy;

      beforeEach(() => {
        removeItemSpy = spyOn(window.localStorage, 'removeItem').and.stub();
      });

      describe('#getSettings', () => {
        it('grabs values from old local storage keys and combine it from new one', async () => {
          getItemSpy
            .withArgs(TEST_ONLY.LEGACY_METRICS_LOCAL_STORAGE_KEY)
            .and.returnValue(
              '{"scalarSmoothing": 0.5, "tooltipSort": "ascending"}'
            )
            .withArgs(TEST_ONLY.NOTIFICATION_LAST_READ_TIME_KEY)
            .and.returnValue('3')
            .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
            .and.returnValue('{"scalarSmoothing": 0.3}');

          const actual = await firstValueFrom(dataSource.getSettings());

          expect(actual).toEqual({
            scalarSmoothing: 0.3,
            tooltipSort: 'ascending' as TooltipSort,
            notificationLastReadTimeInMs: 3,
          });
        });

        it('respects new key over the older unmigrated one if both exists', async () => {
          getItemSpy
            .withArgs(TEST_ONLY.LEGACY_METRICS_LOCAL_STORAGE_KEY)
            .and.returnValue(
              '{"scalarSmoothing": 0.5, "tooltipSort": "ascending"}'
            )
            .withArgs(TEST_ONLY.NOTIFICATION_LAST_READ_TIME_KEY)
            .and.returnValue('3')
            .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
            .and.returnValue(
              '{"tooltipSort": "default", "notificationLastReadTimeInMs": 100}'
            );

          const actual = await firstValueFrom(dataSource.getSettings());

          expect(actual).toEqual({
            scalarSmoothing: 0.5,
            tooltipSort: TooltipSort.DEFAULT,
            notificationLastReadTimeInMs: 100,
          });
        });
      });

      describe('#setSettings', () => {
        it('purges settings value after migrated', async () => {
          await firstValueFrom(
            dataSource.setSettings({
              scalarSmoothing: 0.5,
            })
          );

          // Order of deletion does not matter.
          expect(removeItemSpy).toHaveBeenCalledTimes(2);
          expect(removeItemSpy).toHaveBeenCalledWith(
            TEST_ONLY.LEGACY_METRICS_LOCAL_STORAGE_KEY
          );
          expect(removeItemSpy).toHaveBeenCalledWith(
            TEST_ONLY.NOTIFICATION_LAST_READ_TIME_KEY
          );
        });
      });
    });
  });

  describe('custom converter', () => {
    let dataSource: PersistentSettingsDataSourceImpl<
      UiSettings,
      BackendSettings
    >;

    interface UiSettings {
      foo: number;
    }

    interface BackendSettings {
      bar: string;
    }

    @Injectable()
    class CustomConverter extends SettingsConverter<
      UiSettings,
      BackendSettings
    > {
      uiToBackend(uiSettings: Partial<UiSettings>): Partial<BackendSettings> {
        const backendValue: Partial<BackendSettings> = {};
        if (typeof uiSettings.foo === 'number') {
          backendValue.bar = String(uiSettings.foo);
        }
        return backendValue;
      }
      backendToUi(
        backendSettings: Partial<BackendSettings>
      ): Partial<UiSettings> {
        if (typeof backendSettings.bar === 'string') {
          return {foo: Number(backendSettings.bar)};
        }
        return {};
      }
    }

    beforeEach(async () => {
      dataSource = await configure(CustomConverter);
    });

    describe('#getSettings', () => {
      it('gets setting from the local storage', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue('{"bar": "0.3"}');

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({
          foo: 0.3,
        });
      });

      it('returns an empty object when property does not exist', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue('{"random": "hello"}');

        const actual = await firstValueFrom(dataSource.getSettings());

        expect(actual).toEqual({});
      });
    });

    describe('#setSettings', () => {
      it('sets settings', async () => {
        getItemSpy
          .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
          .and.returnValue('{}');

        await firstValueFrom(
          dataSource.setSettings({
            foo: 0.1,
          })
        );

        expect(setItemSpy).toHaveBeenCalledOnceWith(
          TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY,
          JSON.stringify({bar: '0.1'})
        );
      });
    });
  });
});
