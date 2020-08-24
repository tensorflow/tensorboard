import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {State} from '../../../../../app_state';

import {getSelectedAnnotations, getAnnotationSorting} from '../../../store';
import {AnnotationDataListing} from './../../../store/npmi_types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-annotations-list-header',
  template: `
    <npmi-annotations-list-header-component
      [annotations]="annotations"
      [numAnnotations]="numAnnotations"
      [selectedAnnotations]="selectedAnnotations$ | async"
      [sorting]="annotationSorting$ | async"
      [activeMetrics]="activeMetrics"
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
}
