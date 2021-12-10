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
import {select, Store} from '@ngrx/store';
import {State} from '../../../../app_state';
import * as npmiActions from '../../actions';
import {getPCExpanded, getSelectedAnnotations} from '../../store';

@Component({
  selector: 'npmi-selected-annotations',
  template: `
    <selected-annotations-component
      [pcExpanded]="pcExpanded$ | async"
      [selectedAnnotations]="selectedAnnotations$ | async"
      (onClearSelectedAnnotations)="clearSelectedAnnotations()"
      (onToggleExpanded)="toggleExpanded()"
    ></selected-annotations-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedAnnotationsContainer {
  readonly pcExpanded$ = this.store.pipe(select(getPCExpanded));
  readonly selectedAnnotations$ = this.store.select(getSelectedAnnotations);

  constructor(private readonly store: Store<State>) {}

  clearSelectedAnnotations() {
    this.store.dispatch(npmiActions.npmiClearSelectedAnnotations());
  }

  toggleExpanded() {
    this.store.dispatch(npmiActions.npmiToggleParallelCoordinatesExpanded());
  }
}
