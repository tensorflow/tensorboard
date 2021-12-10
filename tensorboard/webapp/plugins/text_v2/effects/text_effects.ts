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
import {Store} from '@ngrx/store';
import {forkJoin, merge, Observable} from 'rxjs';
import {
  last,
  map,
  mergeMap,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {State} from '../../../app_state';
import {manualReload, reload} from '../../../core/actions';
import {
  textDataLoaded,
  textPluginLoaded,
  textRunToTagsLoaded,
  textTagGroupVisibilityChanged,
} from '../actions';
import {TextV2DataSource} from '../data_source/text_v2_data_source';
import {
  getTextAllVisibleRunTags,
  getTextData,
} from '../store/text_v2_selectors';

@Injectable()
export class TextEffects {
  /** @export */
  readonly loadRunToTags$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(textPluginLoaded),
        switchMap(() => {
          return this.dataSource.fetchRunToTag().pipe(
            tap((runToTags) => {
              this.store.dispatch(textRunToTagsLoaded({runToTags}));
            }),
            map(() => void null)
          );
        })
      );
    },
    {dispatch: false}
  );

  /** @export */
  readonly loadData$ = createEffect(
    () => {
      const fetchOnNewCardVisible = this.actions$.pipe(
        ofType(textTagGroupVisibilityChanged),
        switchMap(({visibleTextCards}) => {
          // Fetch existing data.
          const existingTextData = visibleTextCards.map(({run, tag}) => {
            return this.store.select(getTextData, {run, tag}).pipe(
              last(),
              map((textData) => {
                return {run, tag, textData};
              })
            );
          });
          return forkJoin(existingTextData).pipe(
            map((textData) => {
              // Filter out the <run, tag> tuple if the data already exists.
              return textData
                .filter(({textData}) => textData === null)
                .map(({run, tag}) => ({run, tag}));
            })
          );
        })
      );

      const fetchVisibleCardsOnReload = this.actions$.pipe(
        ofType(manualReload, reload),
        withLatestFrom(this.store.select(getTextAllVisibleRunTags)),
        map(([, runTagList]) => runTagList)
      );

      return merge(fetchOnNewCardVisible, fetchVisibleCardsOnReload).pipe(
        mergeMap((runTagPairs) => {
          return forkJoin(
            runTagPairs.map((runAndTag) => {
              return this.fetchTextData(runAndTag);
            })
          );
        })
      );
    },
    {dispatch: false}
  );

  private fetchTextData(props: {run: string; tag: string}): Observable<void> {
    const {run, tag} = props;
    return this.dataSource.fetchTextData(run, tag).pipe(
      tap((stepData) => {
        this.store.dispatch(textDataLoaded({run, tag, stepData}));
      }),
      map(() => void null)
    );
  }

  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly dataSource: TextV2DataSource
  ) {}
}
