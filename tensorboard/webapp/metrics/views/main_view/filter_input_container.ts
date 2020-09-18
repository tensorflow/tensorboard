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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, of} from 'rxjs';
import {filter, map, switchMap} from 'rxjs/operators';

import {State} from '../../../app_state';
import {
  getMetricsTagFilter,
  getNonEmptyCardIdsWithMetadata,
} from '../../../selectors';
import {metricsTagFilterChanged} from '../../actions';
import {compareTagNames} from '../utils';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'metrics-tag-filter',
  template: `
    <metrics-tag-filter-component
      [regexFilterValue]="tagFilter$ | async"
      [isRegexFilterValid]="isTagFilterRegexValid$ | async"
      [completions]="completions$ | async"
      (onRegexFilterValueChange)="onTagFilterChange($event)"
    ></metrics-tag-filter-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsFilterInputContainer {
  constructor(private readonly store: Store<State>) {}

  readonly tagFilter$ = this.store.select(getMetricsTagFilter);

  readonly isTagFilterRegexValid$ = this.tagFilter$.pipe(
    map((tagFilterString) => {
      try {
        // tslint:disable-next-line:no-unused-expression Check for validity of filter.
        new RegExp(tagFilterString);
        return true;
      } catch (err) {
        return false;
      }
    })
  );

  readonly completions$ = this.store
    .select(getNonEmptyCardIdsWithMetadata)
    .pipe(
      map((cardList) => cardList.map(({tag}) => tag)),
      switchMap((cardList) => {
        return combineLatest([
          of(cardList),
          this.store.select(getMetricsTagFilter),
        ]);
      }),
      map<[string[], string], [string[], RegExp | null]>(
        ([tags, tagFilter]) => {
          try {
            const regex = new RegExp(tagFilter);
            return [tags, regex];
          } catch (e) {
            return [tags, null];
          }
        }
      ),
      filter(([, tagFilterRegex]) => tagFilterRegex !== null),
      map(([tags, tagFilterRegex]) => {
        return tags
          .filter((tag: string) => tagFilterRegex!.test(tag))
          .sort(compareTagNames);
      })
    );

  onTagFilterChange(tagFilter: string) {
    this.store.dispatch(metricsTagFilterChanged({tagFilter}));
  }
}
