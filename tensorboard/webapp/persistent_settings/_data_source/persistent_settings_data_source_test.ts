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
import {TestBed} from '@angular/core/testing';
import {firstValueFrom} from 'rxjs';

import {
  LocalStorageTestingModule,
  TestingLocalStorage,
} from '../../util/local_storage_testing';
import {
  PersistentSettingsDataSourceImpl,
  TEST_ONLY,
} from './persistent_settings_data_source';

describe('persistent_settings data_source test', () => {
  let dataSource: PersistentSettingsDataSourceImpl;
  let localStorage: TestingLocalStorage;
  let getItemSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalStorageTestingModule],
      providers: [PersistentSettingsDataSourceImpl],
    });

    dataSource = TestBed.inject(PersistentSettingsDataSourceImpl);
    localStorage = TestBed.inject(TestingLocalStorage);
    getItemSpy = spyOn(localStorage, 'getItem').and.callThrough();
  });

  describe('#getSettings', () => {
    it('gets setting from the local storage', async () => {
      getItemSpy
        .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
        .and.returnValue('{"scalarSmoothing": 0.3}');

      const actual = await firstValueFrom(dataSource.getSettings());

      expect(actual).toEqual({
        scalarSmoothing: 0.3,
      });
    });

    it('grabs value from old timeseries local storage and combine it from new one', async () => {
      getItemSpy
        .withArgs(TEST_ONLY.LEGACY_METRICS_LOCAL_STORAGE_KEY)
        .and.returnValue('{"scalarSmoothing": 0.5, "tooltipSort": "ascending"}')
        .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
        .and.returnValue('{"scalarSmoothing": 0.3}');

      const actual = await firstValueFrom(dataSource.getSettings());

      expect(actual).toEqual({
        scalarSmoothing: 0.3,
        tooltipSortString: 'ascending',
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
  });

  describe('#setSettings', () => {
    let setItemSpy: jasmine.Spy;
    let removeItemSpy: jasmine.Spy;

    beforeEach(() => {
      setItemSpy = spyOn(localStorage, 'setItem').and.callThrough();
      removeItemSpy = spyOn(localStorage, 'removeItem').and.callThrough();
    });

    it('sets settings', async () => {
      getItemSpy
        .withArgs(TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY)
        .and.returnValue('{"scalarSmoothing": 0.3, "ignoreOutliers": false}');

      await firstValueFrom(
        dataSource.setSettings({
          scalarSmoothing: 0.5,
        })
      );

      expect(setItemSpy).toHaveBeenCalledOnceWith(
        TEST_ONLY.GLOBAL_LOCAL_STORAGE_KEY,
        JSON.stringify({ignoreOutliers: false, scalarSmoothing: 0.5})
      );
    });

    it('purges old timeseries value after migrated', async () => {
      await firstValueFrom(
        dataSource.setSettings({
          scalarSmoothing: 0.5,
        })
      );

      expect(removeItemSpy).toHaveBeenCalledOnceWith(
        TEST_ONLY.LEGACY_METRICS_LOCAL_STORAGE_KEY
      );
    });
  });
});
