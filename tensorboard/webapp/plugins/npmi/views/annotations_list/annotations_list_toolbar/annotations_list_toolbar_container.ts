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
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {map} from 'rxjs/operators';
import {State} from '../../../../../app_state';
import * as npmiActions from '../../../actions';
import {
  getAnnotationsExpanded,
  getAnnotationsRegex,
  getSelectedAnnotations,
  getShowCounts,
  getShowHiddenAnnotations,
} from '../../../store';

@Component({
  selector: 'npmi-annotations-list-toolbar',
  template: `
    <npmi-annotations-list-toolbar-component
      [numAnnotations]="numAnnotations"
      [expanded]="expanded"
      [selectedAnnotations]="selectedAnnotations$ | async"
      [annotationsExpanded]="annotationsExpanded$ | async"
      [showCounts]="showCounts$ | async"
      [showHidden]="showHidden$ | async"
      (onFlagAnnotations)="flagAnnotations($event)"
      (onHideAnnotations)="hideAnnotations($event)"
      (onToggleExpanded)="toggleExpanded()"
      (onToggleShowCounts)="toggleShowCounts()"
      (onToggleShowHidden)="toggleShowHidden()"
    ></npmi-annotations-list-toolbar-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListToolbarContainer {
  @Input() numAnnotations!: number;
  @Input() expanded!: boolean;
  readonly selectedAnnotations$ = this.store.select(getSelectedAnnotations);
  readonly annotationsExpanded$ = this.store.select(getAnnotationsExpanded);
  readonly showCounts$ = this.store.select(getShowCounts);
  readonly showHidden$ = this.store.select(getShowHiddenAnnotations);
  readonly annotationsFilter$ = this.store.select(getAnnotationsRegex);
  readonly isAnnotationsFilterValid$ = this.annotationsFilter$.pipe(
    map((filterString) => {
      try {
        return Boolean(new RegExp(filterString));
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

  flagAnnotations(annotations: string[]) {
    this.store.dispatch(
      npmiActions.npmiToggleAnnotationFlags({
        annotations,
      })
    );
  }

  hideAnnotations(annotations: string[]) {
    this.store.dispatch(
      npmiActions.npmiToggleAnnotationsHidden({
        annotations,
      })
    );
  }

  toggleExpanded() {
    this.store.dispatch(npmiActions.npmiToggleAnnotationsExpanded());
  }

  toggleShowCounts() {
    this.store.dispatch(npmiActions.npmiShowCountsToggled());
  }

  toggleShowHidden() {
    this.store.dispatch(npmiActions.npmiShowHiddenAnnotationsToggled());
  }
}
