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
import {Subject} from 'rxjs';
import {distinctUntilChanged, takeUntil} from 'rxjs/operators';
import '../../tb_polymer_interop_types';
import {getPageSize} from '../_redux/settings_selectors';
import {State} from '../_redux/settings_types';

/**
 * SettingsPolymerInterop is a temporary interop module that writes settings in
 * Ngrx store to Polymer-based TensorBoard components. As long as TensorBoard
 * renders Polymer components, this module should be used.
 *
 * NOTE: there are two classes of settings in the Polymer land: (1) ones
 * persisted in URL and (2) ones stored in JavaScript. This module interops with
 * only (2) kinds. For (1), please refer to the hash_storage.
 */
@Component({
  standalone: false,
  selector: 'settings-polymer-interop',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPolymerInteropContainer {
  private readonly ngUnsubscribe = new Subject<void>();
  private readonly getPageSize$;
  private readonly paginatedViewStore = document.createElement(
    'tf-paginated-view-store'
  ).tf_paginated_view;

  constructor(private store: Store<State>) {
    this.getPageSize$ = this.store.pipe(select(getPageSize));
  }

  ngOnInit() {
    this.getPageSize$
      .pipe(takeUntil(this.ngUnsubscribe), distinctUntilChanged())
      .subscribe((pageSize) => {
        this.paginatedViewStore.setLimit(pageSize);
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
