/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {Component, ChangeDetectionStrategy, OnDestroy} from '@angular/core';
import {Store} from '@ngrx/store';
import {State} from '../../../app_state';
import {Subject} from 'rxjs';
import {
  actions as hparamsActions,
  selectors as hparamsSelectors,
} from '../../../hparams';
import {FilterAddedEvent} from '../../../widgets/data_table/types';

@Component({
  standalone: false,
  selector: 'filterbar',
  template: `<filterbar-component
    [filters]="filters$ | async"
    (removeHparamFilter)="removeHparamFilter($event)"
    (addFilter)="addHparamFilter($event)"
  >
  </filterbar-component>`,
  styles: [``],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterbarContainer implements OnDestroy {
  filters$;

  private readonly ngUnsubscribe = new Subject<void>();

  constructor(private readonly store: Store<State>) {
    this.filters$ = this.store.select(
      hparamsSelectors.getDashboardHparamFilterMap
    );
  }

  addHparamFilter(event: FilterAddedEvent) {
    this.store.dispatch(
      hparamsActions.dashboardHparamFilterAdded({
        name: event.name,
        filter: event.value,
      })
    );
  }

  removeHparamFilter(name: string) {
    this.store.dispatch(
      hparamsActions.dashboardHparamFilterRemoved({
        name,
      })
    );
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
