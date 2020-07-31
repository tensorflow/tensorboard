import {Component, ChangeDetectionStrategy} from '@angular/core';
import {select, Store} from '@ngrx/store';

import {State} from '../../../../app_state';
import {getRunSelection} from '../../../../core/store/core_selectors';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-main',
  template: `
    <main-component [runs]="runs$ | async"></main-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainContainer {
  readonly runs$ = this.store.pipe(select(getRunSelection));

  constructor(private readonly store: Store<State>) {}
}
