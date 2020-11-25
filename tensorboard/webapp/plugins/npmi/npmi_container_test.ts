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
/**
 * Unit tests for the NPMI Container.
 */
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store} from '@ngrx/store';
import {State} from '../../app_state';
import {getCurrentRouteRunSelection} from './../../selectors';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {NpmiComponent} from './npmi_component';
import {NpmiContainer} from './npmi_container';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Container', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NpmiComponent, NpmiContainer],
      providers: [provideMockStore({}), NpmiContainer],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
  });

  it('renders npmi component initially with inactive component', () => {
    store.overrideSelector(getCurrentRouteRunSelection, new Map());
    const fixture = TestBed.createComponent(NpmiContainer);
    fixture.detectChanges();

    const inactiveElement = fixture.debugElement.query(
      By.css('npmi-inactive-view')
    );
    expect(inactiveElement).toBeTruthy();
    const mainElement = fixture.debugElement.query(By.css('npmi-main'));
    expect(mainElement).toBeNull();
  });

  it('renders npmi component', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([['run_1', true]])
    );
    const fixture = TestBed.createComponent(NpmiContainer);
    fixture.detectChanges();

    const inactiveElement = fixture.debugElement.query(
      By.css('npmi-inactive-component')
    );
    expect(inactiveElement).toBeNull();
    const npmiElement = fixture.debugElement.query(By.css('npmi-main'));
    expect(npmiElement).toBeTruthy();
  });
});
