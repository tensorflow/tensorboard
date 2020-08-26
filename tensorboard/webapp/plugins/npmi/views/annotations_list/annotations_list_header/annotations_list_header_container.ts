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
