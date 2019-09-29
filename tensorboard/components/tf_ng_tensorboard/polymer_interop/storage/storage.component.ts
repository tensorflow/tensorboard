/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Store, select} from '@ngrx/store';
import {Subject, combineLatest} from 'rxjs';
import {takeUntil, distinctUntilChanged} from 'rxjs/operators';

import {State, getPageSize} from '../../core/core.reducers';

import {PolymerInteropService} from '../polymer_interop.service';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'storage-interop',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageComponent {
  private ngUnsubscribe = new Subject();
  private getPageSize$ = this.store.pipe(select(getPageSize));

  constructor(
    private store: Store<State>,
    private service: PolymerInteropService
  ) {}

  ngOnInit() {
    this.getPageSize$
      .pipe(
        takeUntil(this.ngUnsubscribe),
        distinctUntilChanged()
      )
      .subscribe((pageSize) => {
        this.service.setPaginationLimit(pageSize);
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
