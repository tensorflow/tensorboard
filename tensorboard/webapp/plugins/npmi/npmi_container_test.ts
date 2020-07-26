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
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {NpmiComponent} from './npmi_component';
import {NpmiContainer} from './npmi_container';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Container', () => {
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NpmiComponent, NpmiContainer],
      providers: [
        provideMockStore({
          initialState: '',
        }),
        NpmiContainer,
      ],
    }).compileComponents();
  });

  it('renders npmi component', () => {
    const fixture = TestBed.createComponent(NpmiContainer);
    fixture.detectChanges();

    const npmiElement = fixture.debugElement.query(
      By.css('npmi-component')
    );
    expect(npmiElement).toBeTruthy();
  });
});
