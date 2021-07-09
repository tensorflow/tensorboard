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
import {SettingsDataSource} from './settings_data_source';
import {SettingsDataSourceModule} from './settings_data_source_module';

describe('SettingsDataSource', () => {
  let dataSource: SettingsDataSource;
  let fakeStorage: {[key: string]: string} = {};

  beforeEach(async () => {
    fakeStorage = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return fakeStorage[key] ?? null;
    });
    spyOn(localStorage, 'setItem').and.callFake(
      (key: string, value: string) => {
        fakeStorage[key] = value;
      }
    );

    await TestBed.configureTestingModule({
      imports: [SettingsDataSourceModule],
    }).compileComponents();

    dataSource = TestBed.inject(SettingsDataSource);
  });

  describe('saveReloadEnabled', () => {
    it('saves reloadEnabled when true', () => {
      dataSource.saveReloadEnabled(true);
      expect(fakeStorage).toEqual({reloadEnabled: 'true'});
    });
    it('saves reloadEnabled when false', () => {
      dataSource.saveReloadEnabled(false);
      expect(fakeStorage).toEqual({reloadEnabled: 'false'});
    });
  });

  describe('saveReloadPeriodInMs', () => {
    it('saves reloadPeriodInMs', () => {
      dataSource.saveReloadPeriodInMs(1111);
      expect(fakeStorage).toEqual({reloadPeriodInMs: '1111'});
    });
  });

  describe('savePageSize', () => {
    it('saves pageSize', () => {
      dataSource.savePageSize(1111);
      expect(fakeStorage).toEqual({pageSize: '1111'});
    });
  });

  describe('fetchSavedSettings', () => {
    it('sets reloadEnabled when true', () => {
      dataSource.saveReloadEnabled(true);
      const results = jasmine.createSpy();
      dataSource.fetchSavedSettings().subscribe(results);
      expect(results).toHaveBeenCalledWith({reloadEnabled: true});
    });

    it('sets reloadEnabled when false', () => {
      dataSource.saveReloadEnabled(false);
      const results = jasmine.createSpy();
      dataSource.fetchSavedSettings().subscribe(results);
      expect(results).toHaveBeenCalledWith({reloadEnabled: false});
    });

    it('sets reloadEnabled to false for any other value', () => {
      fakeStorage = {reloadEnabled: 'not_true_not_false'};
      const results = jasmine.createSpy();
      dataSource.fetchSavedSettings().subscribe(results);
      expect(results).toHaveBeenCalledWith({reloadEnabled: false});
    });

    it('sets reloadPeriodInMs', () => {
      dataSource.saveReloadPeriodInMs(4000);
      const results = jasmine.createSpy();
      dataSource.fetchSavedSettings().subscribe(results);
      expect(results).toHaveBeenCalledWith({reloadPeriodInMs: 4000});
    });

    it('sets pageSize', () => {
      dataSource.savePageSize(1111);
      const results = jasmine.createSpy();
      dataSource.fetchSavedSettings().subscribe(results);
      expect(results).toHaveBeenCalledWith({pageSize: 1111});
    });

    it('sets multiple properties and ignores others', () => {
      fakeStorage = {
        reloadEnabled: 'true',
        reloadPeriodInMs: '1111',
        pageSize: '2222',
        otherLocalStorageProperty: 'ignoreMe!',
      };
      const results = jasmine.createSpy();
      dataSource.fetchSavedSettings().subscribe(results);
      expect(results).toHaveBeenCalledWith({
        reloadEnabled: true,
        reloadPeriodInMs: 1111,
        pageSize: 2222,
      });
    });
  });
});
