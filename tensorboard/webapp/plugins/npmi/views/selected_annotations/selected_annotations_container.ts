import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {State} from '../../../../app_state';

import {getPCExpanded, getSelectedAnnotations} from '../../store';
import * as npmiActions from '../../actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

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
