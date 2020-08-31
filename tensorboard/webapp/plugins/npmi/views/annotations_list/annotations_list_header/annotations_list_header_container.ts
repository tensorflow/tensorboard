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
import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {State} from '../../../../../app_state';

import {getSelectedAnnotations, getAnnotationSorting} from '../../../store';
import {AnnotationDataListing, SortingOrder} from './../../../store/npmi_types';
import * as npmiActions from '../../../actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-annotations-list-header',
  template: `
    <npmi-annotations-list-header-component
      [numAnnotations]="numAnnotations"
      [selectedAnnotations]="selectedAnnotations$ | async"
      [sorting]="annotationSorting$ | async"
      [activeMetrics]="activeMetrics"
      (onChangeSorting)="changeSorting($event)"
      (onAllAnnotationsToggled)="allAnnotationsToggled($event)"
    ></npmi-annotations-list-header-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListHeaderContainer {
  @Input() numAnnotations!: number;
  @Input() annotations!: AnnotationDataListing;
  @Input() activeMetrics!: string[];
  readonly selectedAnnotations$ = this.store.select(getSelectedAnnotations);
  readonly annotationSorting$ = this.store.select(getAnnotationSorting);

  constructor(private readonly store: Store<State>) {}

  changeSorting(sortingChange: {
    newMetric: string;
    oldSorting: {metric: string; order: SortingOrder};
  }) {
    let newSorting = {
      metric: sortingChange.newMetric,
      order: SortingOrder.DOWN,
    };
    if (
      sortingChange.oldSorting.metric === sortingChange.newMetric &&
      sortingChange.oldSorting.order === SortingOrder.DOWN
    ) {
      newSorting.order = SortingOrder.UP;
    }
    this.store.dispatch(
      npmiActions.npmiChangeAnnotationSorting({sorting: newSorting})
    );
  }

  allAnnotationsToggled(checked: boolean) {
    if (checked) {
      this.store.dispatch(
        npmiActions.npmiSetSelectedAnnotations({
          annotations: Object.keys(this.annotations),
        })
      );
    } else {
      this.store.dispatch(
        npmiActions.npmiSetSelectedAnnotations({annotations: []})
      );
    }
  }
}
