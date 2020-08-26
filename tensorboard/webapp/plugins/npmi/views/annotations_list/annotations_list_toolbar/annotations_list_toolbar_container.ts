import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {State} from '../../../../../app_state';
import {map} from 'rxjs/operators';
import * as npmiActions from '../../../actions';

import {
  getSelectedAnnotations,
  getAnnotationsExpanded,
  getShowCounts,
  getAnnotationsRegex,
  getShowHiddenAnnotations,
} from '../../../store';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

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
      [regexFilterValue]="annotationsFilter$ | async"
      [isRegexFilterValid]="isAnnotationsFilterValid$ | async"
      (onRegexFilterValueChange)="filterChange($event)"
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
        // tslint:disable-next-line:no-unused-expression Check for validity of filter.
        new RegExp(filterString);
        return true;
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
    this.store.dispatch(npmiActions.npmiClearSelectedAnnotations());
  }

  hideAnnotations(annotations: string[]) {
    this.store.dispatch(
      npmiActions.npmiToggleAnnotationsHidden({
        annotations,
      })
    );
    this.store.dispatch(npmiActions.npmiClearSelectedAnnotations());
  }

  toggleExpanded() {
    this.store.dispatch(npmiActions.npmiToggleAnnotationsExpanded());
  }

  toggleShowCounts() {
    this.store.dispatch(npmiActions.npmiToggleShowCounts());
  }

  toggleShowHidden() {
    this.store.dispatch(npmiActions.npmiToggleShowHiddenAnnotations());
  }
}
