/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {Actions, ofType, createEffect} from '@ngrx/effects';
import {of} from 'rxjs';
import {map, flatMap, catchError} from 'rxjs/operators';

import {CoreService} from './core.service';
import {
  coreLoaded,
  pluginsListingLoaded,
  pluginsListingFailed,
} from './core.actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrx from '@ngrx/store/src/models';

@Injectable()
export class CoreEffects {
  /**
   * Requires to be exported for JSCompiler. JSCompiler, otherwise,
   * think it is unused property and deadcode eliminate away.
   */
  /** @export */
  readonly loadPluginsListing$ = createEffect(() =>
    this.actions$.pipe(
      ofType(coreLoaded),
      flatMap(() =>
        this.coreService
          .fetchPluginsListing()
          .pipe(
            map(
              (plugins) => pluginsListingLoaded({plugins}),
              catchError(() => of(pluginsListingFailed()))
            )
          )
      )
    )
  );

  constructor(
    private readonly actions$: Actions,
    private readonly coreService: CoreService
  ) {}
}
