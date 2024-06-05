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
import {Injectable} from '@angular/core';
import {Tag} from './types';

const SAVED_SCALAR_PINS_KEY = 'tb-saved-scalar-pins';

@Injectable()
export class SavedPinsDataSource {
  saveScalarPin(tag: Tag): void {
    const existingPins = this.getSavedScalarPins();
    if (!existingPins.includes(tag)) {
      existingPins.push(tag);
    }
    window.localStorage.setItem(
      SAVED_SCALAR_PINS_KEY,
      JSON.stringify(existingPins)
    );
  }

  saveScalarPins(tags: Tag[]): void {
    const existingPins = this.getSavedScalarPins();
    const newTags = tags.filter((v) => !existingPins.includes(v));
    existingPins.push(...newTags);
    window.localStorage.setItem(
      SAVED_SCALAR_PINS_KEY,
      JSON.stringify(existingPins)
    );
  }

  removeScalarPin(tag: Tag): void {
    const existingPins = this.getSavedScalarPins();
    window.localStorage.setItem(
      SAVED_SCALAR_PINS_KEY,
      JSON.stringify(existingPins.filter((pin) => pin !== tag))
    );
  }

  getSavedScalarPins(): Tag[] {
    const savedPins = window.localStorage.getItem(SAVED_SCALAR_PINS_KEY);
    if (savedPins) {
      return JSON.parse(savedPins) as Tag[];
    }
    return [];
  }

  removeAllScalarPins(): void {
    window.localStorage.setItem(SAVED_SCALAR_PINS_KEY, JSON.stringify([]));
  }
}
