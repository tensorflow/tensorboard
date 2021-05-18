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
import {createAction, Action} from '@ngrx/store';
import {Actions, ofType, createEffect} from '@ngrx/effects';
import {map} from 'rxjs/operators';

import {scalarSmoothingChanged} from './settings_actions';

@Injectable()
export class SettingsEffects {
  /** @export */
  readonly setSettingsToLocalStorage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(scalarSmoothingChanged),
      map(() => {
        const features = this.dataSource.getFeatures();
        return partialFeatureFlagsLoaded({features});
      })
    )
  );

  constructor(private readonly actions$: Actions) {}
}
