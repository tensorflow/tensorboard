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
import {State} from '../../../../../app_state';
import * as npmiActions from '../../../actions';
import {getAnnotationSort, getSelectedAnnotations} from '../../../store';
import {AnnotationDataListing} from './../../../store/npmi_types';

@Component({
  selector: 'npmi-annotations-list-header',
  template: `
    <npmi-annotations-list-header-component
      [numAnnotations]="numAnnotations"
      [selectedAnnotations]="selectedAnnotations$ | async"
      [sort]="annotationSort$ | async"
      [activeMetrics]="activeMetrics"
      (onChangeSort)="changeSort($event)"
      (onAllAnnotationsToggled)="allAnnotationsToggled($event)"
    ></npmi-annotations-list-header-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderContainer {
  @Input() numAnnotations!: number;
  @Input() annotations!: AnnotationDataListing;
  @Input() activeMetrics!: string[];
  readonly selectedAnnotations$ = this.store.select(getSelectedAnnotations);
  readonly annotationSort$ = this.store.select(getAnnotationSort);

  constructor(private readonly store: Store<State>) {}

  changeSort(newMetric: string) {
    this.store.dispatch(
      npmiActions.npmiAnnotationSortChanged({metric: newMetric})
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
