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
 * Unit tests for the Main Container.
 */
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store} from '@ngrx/store';
import {State} from '../../../../app_state';
import {getRunSelection} from './../../../../core/store/core_selectors';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {MainComponent} from './main_component';
import {MainContainer} from './main_container';
import {RunsModule} from '../../../../runs/runs_module';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Main Container', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MainComponent, MainContainer],
      imports: [RunsModule],
      providers: [provideMockStore({})],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRunSelection, new Map([['run_1', true]]));
  });

  it('renders npmi main component', () => {
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const runsElement = fixture.debugElement.query(
      By.css('tb-legacy-runs-selector')
    );
    expect(runsElement).toBeTruthy();
  });
});
