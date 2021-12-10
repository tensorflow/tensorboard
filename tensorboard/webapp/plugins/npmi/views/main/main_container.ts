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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {map} from 'rxjs/operators';
import {State} from '../../../../app_state';
import {getCurrentRouteRunSelection} from '../../../../selectors';
import * as npmiActions from '../../actions';
import {
  getSidebarExpanded,
  getSidebarWidth,
} from './../../store/npmi_selectors';

@Component({
  selector: 'npmi-main',
  template: `
    <main-component
      [runActive]="runActive$ | async"
      [sidebarExpanded]="sidebarExpanded$ | async"
      [sidebarWidth]="sidebarWidth$ | async"
      (toggleSidebarExpanded)="onToggleSidebarExpanded()"
      (resizeTriggered)="onResizeTriggered($event)"
      (resizeGrabbed)="onResizeGrabbed()"
      (resizeReleased)="onResizeReleased()"
    ></main-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainContainer {
  readonly runActive$ = this.store
    .pipe(select(getCurrentRouteRunSelection))
    .pipe(
      map((runs) => {
        if (!runs) {
          return false;
        }
        return [...runs.values()].includes(true);
      })
    );
  readonly sidebarExpanded$ = this.store.pipe(select(getSidebarExpanded));
  readonly sidebarWidth$ = this.store.pipe(select(getSidebarWidth));
  resizing = false;

  constructor(private readonly store: Store<State>) {}

  onToggleSidebarExpanded() {
    this.store.dispatch(npmiActions.npmiToggleSidebarExpanded());
  }

  onResizeTriggered(event: MouseEvent) {
    if (this.resizing) {
      this.store.dispatch(
        npmiActions.npmiSidebarWidthChanged({
          sidebarWidth: event.clientX,
        })
      );
    }
  }

  onResizeGrabbed() {
    this.resizing = true;
  }

  onResizeReleased() {
    this.resizing = false;
  }
}
