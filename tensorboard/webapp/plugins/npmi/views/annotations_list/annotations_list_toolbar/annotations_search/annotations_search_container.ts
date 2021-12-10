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
import {map} from 'rxjs/operators';
import {State} from '../../../../../../app_state';
import * as npmiActions from '../../../../actions';
import {getAnnotationsRegex} from '../../../../store';

@Component({
  selector: 'npmi-annotations-search',
  template: `
    <npmi-annotations-search-component
      [regexFilterValue]="annotationsFilter$ | async"
      [isRegexFilterValid]="isAnnotationsFilterValid$ | async"
      (onRegexFilterValueChange)="filterChange($event)"
    ></npmi-annotations-search-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsSearchContainer {
  readonly annotationsFilter$ = this.store.select(getAnnotationsRegex);
  readonly isAnnotationsFilterValid$ = this.annotationsFilter$.pipe(
    map((filterString) => {
      try {
        // tslint:disable-next-line:no-unused-expression Check for validity of filter.
        new RegExp(filterString);
        return true;
      } catch (err) {
        return false;
      }
    })
  );

  constructor(private readonly store: Store<State>) {}

  filterChange(filter: string) {
    this.store.dispatch(
      npmiActions.npmiAnnotationsRegexChanged({regex: filter})
    );
  }
}
