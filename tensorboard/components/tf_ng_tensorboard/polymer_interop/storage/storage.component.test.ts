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
import {DebugElement} from '@angular/core';
import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {StorageComponent} from './storage.component';

import {PolymerInteropService} from '../polymer_interop.service';
import {getPageSize, State, CoreState} from '../../core/core.reducers';
import {
  createPluginMetadata,
  createState,
  createCoreState,
} from '../../core/testing';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('storage.component', () => {
  let store: MockStore<State>;
  let polymerInterop: PolymerInteropService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          initialState: createState(
            createCoreState({
              pageSize: 10,
            })
          ),
        }),
        StorageComponent,
        PolymerInteropService,
      ],
      declarations: [StorageComponent],
    }).compileComponents();
    store = TestBed.get(Store);
    polymerInterop = TestBed.get(PolymerInteropService);
  });

  it('sets pagination limit via service when pageSize changes', () => {
    const setPaginationSpy = spyOn(polymerInterop, 'setPaginationLimit');
    const fixture = TestBed.createComponent(StorageComponent);
    fixture.detectChanges();

    expect(setPaginationSpy).toHaveBeenCalledTimes(1);
    expect(setPaginationSpy).toHaveBeenCalledWith(10);

    store.setState(
      createState(
        createCoreState({
          pageSize: 15,
        })
      )
    );
    fixture.detectChanges();
    expect(setPaginationSpy).toHaveBeenCalledTimes(2);
    expect(setPaginationSpy).toHaveBeenCalledWith(15);

    store.setState(
      createState(
        createCoreState({
          pageSize: 15,
        })
      )
    );
    expect(setPaginationSpy).toHaveBeenCalledTimes(2);
  });
});
