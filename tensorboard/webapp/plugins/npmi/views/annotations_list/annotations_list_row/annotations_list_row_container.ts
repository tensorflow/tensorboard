import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {State} from '../../../../../app_state';

import {
  getSelectedAnnotations,
  getFlaggedAnnotations,
  getHiddenAnnotations,
  getShowCounts,
} from '../../../store';
import {ValueData} from '../../../store/npmi_types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-annotations-list-row',
  template: `
    <annotation-component
      [data]="data"
      [maxCount]="maxCount"
      [activeMetrics]="activeMetrics"
      [annotation]="annotation"
      [selectedAnnotations]="selectedAnnotations$ | async"
      [flaggedAnnotations]="flaggedAnnotations$ | async"
      [hiddenAnnotations]="hiddenAnnotations$ | async"
      [showCounts]="showCounts$ | async"
    ></annotation-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListRowContainer {
  @Input() data!: ValueData[];
  @Input() maxCount!: number;
  @Input() activeMetrics!: string[];
  @Input() annotation!: string;

  readonly flaggedAnnotations$ = this.store.select(getFlaggedAnnotations);
  readonly hiddenAnnotations$ = this.store.select(getHiddenAnnotations);
  readonly selectedAnnotations$ = this.store.select(getSelectedAnnotations);
  readonly showCounts$ = this.store.select(getShowCounts);

  constructor(private readonly store: Store<State>) {}
}
