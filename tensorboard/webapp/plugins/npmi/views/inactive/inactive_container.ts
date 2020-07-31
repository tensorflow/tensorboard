import {Component} from '@angular/core';
import {Store} from '@ngrx/store';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

// TODO(cais): Move to a separate file.
export interface InactiveState {}

@Component({
  selector: 'npmi-inactive',
  template: `
    <inactive-component></inactive-component>
  `,
})
export class InactiveContainer {
  constructor(private readonly store: Store<InactiveState>) {}
}
