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

import {
  getSelectedAnnotations,
  getFlaggedAnnotations,
  getHiddenAnnotations,
  getShowCounts,
  getSidebarWidth,
} from '../../../store';
import {ValueData} from '../../../store/npmi_types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-annotation',
  template: `
    <annotation-component
      [data]="data"
      [maxCount]="maxCount"
      [activeMetrics]="activeMetrics"
      [numActiveRuns]="numActiveRuns"
      [annotation]="annotation"
      [runHeight]="runHeight"
      [selectedAnnotations]="selectedAnnotations$ | async"
      [flaggedAnnotations]="flaggedAnnotations$ | async"
      [hiddenAnnotations]="hiddenAnnotations$ | async"
      [showCounts]="showCounts$ | async"
      [sidebarWidth]="sidebarWidth$ | async"
    ></annotation-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationContainer {
  @Input() data!: ValueData[];
  @Input() maxCount!: number;
  @Input() activeMetrics!: string[];
  @Input() numActiveRuns!: number;
  @Input() annotation!: string;
  @Input() runHeight!: number;

  readonly flaggedAnnotations$ = this.store.select(getFlaggedAnnotations);
  readonly hiddenAnnotations$ = this.store.select(getHiddenAnnotations);
  readonly selectedAnnotations$ = this.store.select(getSelectedAnnotations);
  readonly showCounts$ = this.store.select(getShowCounts);
  readonly sidebarWidth$ = this.store.select(getSidebarWidth);

  constructor(private readonly store: Store<State>) {}
}
