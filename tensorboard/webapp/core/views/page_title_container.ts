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
  Inject,
  Optional,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {
  combineLatestWith,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  startWith,
} from 'rxjs/operators';
import {RouteKind} from '../../app_routing/types';
import {
  getExperiment,
  getExperimentIdsFromRoute,
  getRouteKind,
} from '../../selectors';
import {State} from '../state';
import {getEnvironment} from '../store';
import {TB_BRAND_NAME} from '../types';

const DEFAULT_BRAND_NAME = 'TensorBoard';

/**
 * Renders page title.
 */
@Component({
  standalone: false,
  selector: 'page-title',
  template: `
    <page-title-component [title]="title$ | async"></page-title-component>
  `,
  styles: [
    `
      :host {
        display: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageTitleContainer {
  private readonly getExperimentId$;

  private readonly experimentName$;

  readonly title$;

  constructor(
    private readonly store: Store<State>,
    @Optional()
    @Inject(TB_BRAND_NAME)
    private readonly customBrandName: string | null
  ) {
    this.getExperimentId$ = this.store.select(getExperimentIdsFromRoute).pipe(
      map((experimentIds) => {
        return experimentIds?.[0];
      })
    );
    this.experimentName$ = this.getExperimentId$.pipe(
      filter(Boolean),
      mergeMap((experimentId) => {
        // Selectors with props are deprecated (getExperiment):
        // https://github.com/ngrx/platform/issues/2980
        // tslint:disable-next-line:deprecation
        return this.store.select(getExperiment, {experimentId});
      }),
      map((experiment) => (experiment ? experiment.name : null))
    );
    this.title$ = this.store.select(getEnvironment).pipe(
      combineLatestWith(this.store.select(getRouteKind), this.experimentName$),
      map(([env, routeKind, experimentName]) => {
        const tbBrandName = this.customBrandName || DEFAULT_BRAND_NAME;
        if (env.window_title) {
          // (it's an empty string when the `--window_title` flag is not set)
          return env.window_title;
        }
        if (routeKind === RouteKind.EXPERIMENT && experimentName) {
          return `${experimentName} - ${tbBrandName}`;
        }
        return tbBrandName;
      }),
      startWith(this.customBrandName || DEFAULT_BRAND_NAME),
      distinctUntilChanged()
    );
  }
}
