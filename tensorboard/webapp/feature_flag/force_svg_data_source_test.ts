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
import {LocalStorageTestingModule} from '../util/local_storage_testing';
import {FORCE_SVG_RENDERER} from '../webapp_data_source/tb_feature_flag_data_source_types';
import {ForceSvgDataSource} from './force_svg_data_source';

describe('feature_flag/force_svg_util test', () => {
  let dataSource: ForceSvgDataSource;
  let getItemReturnValue: string | null;
  let getItemSpy: jasmine.Spy;
  let setItemSpy: jasmine.Spy;
  let removeItemSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalStorageTestingModule],
      providers: [ForceSvgDataSource],
    }).compileComponents();

    // localStorage = TestBed.inject(TestingLocalStorage);
    getItemSpy = spyOn(window.localStorage, 'getItem').and.callFake(
      (key: string) => {
        return getItemReturnValue;
      }
    );
    setItemSpy = spyOn(window.localStorage, 'setItem').and.stub();
    removeItemSpy = spyOn(window.localStorage, 'removeItem').and.stub();
    dataSource = TestBed.inject(ForceSvgDataSource);
  });
  describe('#getForceSVG', () => {
    it('returns false if localStorage.getItem returns null', () => {
      getItemReturnValue = null;
      const actual = dataSource.getForceSvgFlag();
      expect(getItemSpy).toHaveBeenCalledOnceWith(FORCE_SVG_RENDERER);
      expect(actual).toBeFalse();
    });

    it('returns true if there is a value returned by localstorage.getItem with the key "forceSVG"', () => {
      getItemReturnValue = 'this should not matter';
      const actual = dataSource.getForceSvgFlag();
      expect(getItemSpy).toHaveBeenCalledOnceWith(FORCE_SVG_RENDERER);
      expect(actual).toBeTruthy();
    });
  });

  describe('updateForceSVG', () => {
    it('Creates localStorage entry with key forceSVG when passed truthy', () => {
      let dataSource = new ForceSvgDataSource();
      dataSource.updateForceSvgFlag(true);
      expect(setItemSpy).toHaveBeenCalledOnceWith(
        FORCE_SVG_RENDERER,
        jasmine.any(String)
      );
    });
    it('calls localStorage.removeItem with key forceSVG', () => {
      let dataSource = new ForceSvgDataSource();
      dataSource.updateForceSvgFlag(false);
      expect(removeItemSpy).toHaveBeenCalledOnceWith(FORCE_SVG_RENDERER);
    });
  });
});
