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

import {TestBed} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {provideMockTbStore} from '../../testing/utils';
import {getPageSize} from '../_redux/settings_selectors';
import {SettingsPolymerInteropContainer} from './polymer_interop_container';

describe('settings polymer_interop', () => {
  let store: MockStore;
  let setLimitCalls: number[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideMockTbStore()],
      declarations: [SettingsPolymerInteropContainer],
    }).compileComponents();

    store = TestBed.inject<Store>(Store) as MockStore;
    store.overrideSelector(getPageSize, 5);

    setLimitCalls = [];
    const createElementSpy = spyOn(document, 'createElement').and.callThrough();
    createElementSpy.withArgs('tf-paginated-view-store').and.returnValue({
      tf_paginated_view: {
        setLimit: (limit: number) => {
          setLimitCalls.push(limit);
        },
      },
    } as unknown as HTMLElement);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('sets pagination limit when pageSize changes', () => {
    store.overrideSelector(getPageSize, 5);
    const fixture = TestBed.createComponent(SettingsPolymerInteropContainer);
    fixture.detectChanges();

    expect(setLimitCalls).toEqual([5]);

    store.overrideSelector(getPageSize, 10);
    store.refreshState();
    fixture.detectChanges();

    expect(setLimitCalls).toEqual([5, 10]);
  });

  it('does not set limit when the value does not change', () => {
    store.overrideSelector(getPageSize, 5);
    const fixture = TestBed.createComponent(SettingsPolymerInteropContainer);
    fixture.detectChanges();

    expect(setLimitCalls).toEqual([5]);

    store.overrideSelector(getPageSize, 5);
    store.refreshState();
    fixture.detectChanges();

    expect(setLimitCalls).toEqual([5]);

    store.overrideSelector(getPageSize, 10);
    store.refreshState();
    fixture.detectChanges();

    expect(setLimitCalls).toEqual([5, 10]);
  });
});
