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
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {State} from '../../../../../app_state';
import * as selectors from '../../../../../selectors';
import {RunColorScale} from '../../../../../types/ui';
import * as npmiActions from '../../../actions';
import {
  getAnnotationSort,
  getFlaggedAnnotations,
  getHiddenAnnotations,
  getSelectedAnnotations,
  getShowCounts,
  getSidebarWidth,
} from '../../../store';
import {ValueData} from '../../../store/npmi_types';

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
      [hasEmbedding]="hasEmbedding"
      [sort]="sort$ | async"
      [selectedAnnotations]="selectedAnnotations$ | async"
      [flaggedAnnotations]="flaggedAnnotations$ | async"
      [hiddenAnnotations]="hiddenAnnotations$ | async"
      [showCounts]="showCounts$ | async"
      [sidebarWidth]="sidebarWidth$ | async"
      [colorScale]="runColorScale$ | async"
      [runIdToRuns]="runIdToRuns$ | async"
      (onShowSimilarAnnotations)="showSimilarAnnotations()"
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
  @Input() hasEmbedding!: boolean;

  readonly sort$ = this.store.select(getAnnotationSort);
  readonly flaggedAnnotations$ = this.store.select(getFlaggedAnnotations);
  readonly hiddenAnnotations$ = this.store.select(getHiddenAnnotations);
  readonly selectedAnnotations$ = this.store.select(getSelectedAnnotations);
  readonly showCounts$ = this.store.select(getShowCounts);
  readonly sidebarWidth$ = this.store.select(getSidebarWidth);
  readonly runColorScale$: Observable<RunColorScale> = this.store
    .select(selectors.getRunColorMap)
    .pipe(
      map((colorMap) => {
        return (runId: string) => {
          if (!colorMap.hasOwnProperty(runId)) {
            throw new Error(`[Color scale] unknown runId: ${runId}.`);
          }
          return colorMap[runId];
        };
      })
    );
  readonly runIdToRuns$ = this.store.select(selectors.getRunMap);

  constructor(private readonly store: Store<State>) {}

  showSimilarAnnotations() {
    this.store.dispatch(
      npmiActions.npmiSimilaritySortChanged({
        annotation: this.annotation,
      })
    );
  }
}
