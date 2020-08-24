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
      [selectedAnnotations]="selectedAnnotations$ | async"
      [annotationsExpanded]="annotationsExpanded$ | async"
      [showCounts]="showCounts$ | async"
      [showHidden]="showHidden$ | async"
      [regexFilterValue]="annotationsFilter$ | async"
      [isRegexFilterValid]="isAnnotationsFilterValid$ | async"
      (onRegexFilterValueChange)="onFilterChange($event)"
    ></npmi-annotations-list-toolbar-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListToolbarContainer {
  @Input() numAnnotations!: number;
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
  onFilterChange(filter: string) {
    this.store.dispatch(
      npmiActions.npmiAnnotationsRegexChanged({regex: filter})
    );
  }

  constructor(private readonly store: Store<State>) {}
}
