/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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
import {SavedPinsDataSource} from './saved_pins_data_source';

const SAVED_SCALAR_PINS_KEY = 'tb-saved-scalar-pins';

describe('SavedPinsDataSource Test', () => {
  let mockStorage: Record<string, string>;
  let dataSource: SavedPinsDataSource;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [SavedPinsDataSource],
    });

    dataSource = TestBed.inject(SavedPinsDataSource);

    mockStorage = {};
    spyOn(window.localStorage, 'setItem').and.callFake(
      (key: string, value: string) => {
        if (key !== SAVED_SCALAR_PINS_KEY) {
          throw new Error('incorrect key used');
        }

        mockStorage[key] = value;
      }
    );

    spyOn(window.localStorage, 'getItem').and.callFake((key: string) => {
      if (key !== SAVED_SCALAR_PINS_KEY) {
        throw new Error('incorrect key used');
      }

      return mockStorage[key];
    });
  });

  describe('getSavedScalarPins', () => {
    it('gets the saved scalar pins', () => {
      window.localStorage.setItem(
        SAVED_SCALAR_PINS_KEY,
        JSON.stringify(['new_tag'])
      );

      const result = dataSource.getSavedScalarPins();

      expect(result).toEqual(['new_tag']);
    });

    it('returns empty list if there is no saved pins', () => {
      const result = dataSource.getSavedScalarPins();

      expect(result).toEqual([]);
    });
  });

  describe('saveScalarPin', () => {
    it('stores the provided tag in the local storage', () => {
      dataSource.saveScalarPin('tag1');

      expect(dataSource.getSavedScalarPins()).toEqual(['tag1']);
    });

    it('adds the provided tag to the existing list', () => {
      window.localStorage.setItem(
        SAVED_SCALAR_PINS_KEY,
        JSON.stringify(['tag1'])
      );

      dataSource.saveScalarPin('tag2');

      expect(dataSource.getSavedScalarPins()).toEqual(['tag1', 'tag2']);
    });

    it('does not add the provided tag if it already exists', () => {
      window.localStorage.setItem(
        SAVED_SCALAR_PINS_KEY,
        JSON.stringify(['tag1', 'tag2'])
      );

      dataSource.saveScalarPin('tag2');

      expect(dataSource.getSavedScalarPins()).toEqual(['tag1', 'tag2']);
    });
  });

  describe('saveScalarPins', () => {
    it('stores the provided tags in the local storage', () => {
      dataSource.saveScalarPins(['tag1', 'tag2']);

      expect(dataSource.getSavedScalarPins()).toEqual(['tag1', 'tag2']);
    });

    it('adds the provided tags to the existing list', () => {
      window.localStorage.setItem(
        SAVED_SCALAR_PINS_KEY,
        JSON.stringify(['tag1'])
      );

      dataSource.saveScalarPins(['tag2']);

      expect(dataSource.getSavedScalarPins()).toEqual(['tag1', 'tag2']);
    });

    it('does not add the tag if it already exists', () => {
      window.localStorage.setItem(
        SAVED_SCALAR_PINS_KEY,
        JSON.stringify(['tag1', 'tag2'])
      );

      dataSource.saveScalarPins(['tag2', 'tag3']);

      expect(dataSource.getSavedScalarPins()).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('removeScalarPin', () => {
    it('removes the given tag if it exists', () => {
      dataSource.saveScalarPin('tag3');

      dataSource.removeScalarPin('tag3');

      expect(dataSource.getSavedScalarPins().length).toEqual(0);
    });

    it('does not remove anything if the given tag does not exist', () => {
      dataSource.saveScalarPin('tag1');

      dataSource.removeScalarPin('tag3');

      expect(dataSource.getSavedScalarPins()).toEqual(['tag1']);
    });
  });

  describe('removeAllScalarPins', () => {
    it('removes all existing pins', () => {
      dataSource.saveScalarPin('tag3');
      dataSource.saveScalarPin('tag4');

      dataSource.removeAllScalarPins();

      expect(dataSource.getSavedScalarPins().length).toEqual(0);
    });
  });
});
