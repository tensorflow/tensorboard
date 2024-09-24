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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {State} from '../../../app_state';
import {PluginType} from '../../data_source';
import {getMetricsFilteredPluginTypes, getMetricsTagFilter} from '../../store';
import {getSortedRenderableCardIdsWithMetadata} from './common_selectors';

/**
 * Warning message that displays when no tags do not match filter query.
 */
@Component({
  standalone: false,
  selector: 'metrics-empty-tag-match',
  template: `
    <metrics-empty-tag-match-component
      [pluginTypes]="pluginTypes$ | async"
      [tagFilterRegex]="tagFilterRegex$ | async"
      [tagCounts]="tagCounts$ | async"
    ></metrics-empty-tag-match-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyTagMatchMessageContainer {
  constructor(private readonly store: Store<State>) {
    this.pluginTypes$ = this.store.select(getMetricsFilteredPluginTypes);
    this.tagFilterRegex$ = this.store.select(getMetricsTagFilter);
    this.tagCounts$ = this.store
      .select(getSortedRenderableCardIdsWithMetadata)
      .pipe(
        map((cardList) => {
          return new Set(cardList.map(({tag}) => tag)).size;
        })
      );
  }

  readonly pluginTypes$: Observable<Set<PluginType>>;
  readonly tagFilterRegex$: Observable<string>;
  readonly tagCounts$: Observable<number>;
}
