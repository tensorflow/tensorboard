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
import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {merge, Observable} from 'rxjs';
import {map, mergeMap, share, tap} from 'rxjs/operators';
import {textPluginLoaded} from '../actions';
import {Tftext2HttpServerDataSource} from '../data_source/tftext2_data_source';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrxStore from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects/effects';

@Injectable()
export class TextEffects {
  readonly loadData$: Observable<{}>;

  private loadTextRuns(): Observable<void> {
    return this.actions$.pipe(
      ofType(textPluginLoaded),
      mergeMap(() => {
        return this.dataSource.fetchRuns().pipe(
          tap((runs) => {
            console.log(runs);
          }),
          map(() => void null)
        );
      }),
    );
  }

  constructor(
    private actions$: Actions,
    private dataSource: Tftext2HttpServerDataSource
  ) {
    this.loadData$ = createEffect(
      () => {
        const loadTextRuns$ = this.loadTextRuns().pipe(share());

        return merge(loadTextRuns$).pipe(map(() => ({})));
      },
      {dispatch: false}
    );
  }
}
