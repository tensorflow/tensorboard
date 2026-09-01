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
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Signal,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Store} from '@ngrx/store';
import {combineLatestWith, filter, map, startWith} from 'rxjs/operators';
import {State} from '../../../app_state';
import {
  getMetricsTagFilter,
  getNonEmptyCardIdsWithMetadata,
} from '../../../selectors';
import {metricsTagFilterChanged} from '../../actions';
import {getMetricsFilteredPluginTypes} from '../../store';
import {compareTagNames} from '../../utils';

@Component({
  standalone: false,
  selector: 'metrics-tag-filter',
  template: `
    <metrics-tag-filter-component
      [regexFilterValue]="tagFilter()"
      [isRegexFilterValid]="isTagFilterRegexValid()"
      [completions]="completions()"
      (onRegexFilterValueChange)="onTagFilterChange($event)"
    ></metrics-tag-filter-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsFilterInputContainer {
  constructor(private readonly store: Store<State>) {
    this.tagFilter = this.store.selectSignal(getMetricsTagFilter);
    this.isTagFilterRegexValid = computed(() => {
      try {
        // Construct only to validate the regex syntax, invalid patterns throw error.
        // tslint:disable-next-line:no-unused-expression
        new RegExp(this.tagFilter());
        return true;
      } catch (err) {
        return false;
      }
    });
    this.completions = toSignal(
      this.store.select(getNonEmptyCardIdsWithMetadata).pipe(
        combineLatestWith(this.store.select(getMetricsFilteredPluginTypes)),
        map(([cardList, filteredPluginTypes]) => {
          return cardList
            .filter(({plugin}) => {
              return (
                !filteredPluginTypes.size || filteredPluginTypes.has(plugin)
              );
            })
            .map(({tag}) => tag);
        }),
        // De-duplicate using Set since Image cards has a notion of Sample and
        // the same `run` and `tag` can appear more than once.
        map((tags) => [...new Set(tags)]),
        map((tags) => tags.sort(compareTagNames)),
        combineLatestWith(this.store.select(getMetricsTagFilter)),
        map<[string[], string], [string[], RegExp | null]>(
          ([tags, tagFilter]) => {
            try {
              const regex = new RegExp(tagFilter, 'i');
              return [tags, regex];
            } catch (e) {
              return [tags, null];
            }
          }
        ),
        filter(([, tagFilterRegex]) => tagFilterRegex !== null),
        map(([tags, tagFilterRegex]) => {
          return tags.filter((tag: string) => tagFilterRegex!.test(tag));
        }),
        startWith([] as string[])
      ),
      {requireSync: true}
    );
  }

  readonly tagFilter: Signal<string>;

  readonly isTagFilterRegexValid: Signal<boolean>;

  readonly completions: Signal<string[]>;

  onTagFilterChange(tagFilter: string) {
    this.store.dispatch(metricsTagFilterChanged({tagFilter}));
  }
}
