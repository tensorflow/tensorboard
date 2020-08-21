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
 * Unit tests for the violin filters.
 */
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Action, Store} from '@ngrx/store';
import {State} from '../../../../app_state';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {ViolinFiltersComponent} from './violin_filters_component';
import {appStateFromNpmiState, createNpmiState} from '../../testing';
import {createState, createCoreState} from '../../../../core/testing';
import * as npmiActions from '../../actions';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Violin Filters Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViolinFiltersComponent],
      imports: [],
      providers: [
        provideMockStore({
          initialState: {
            ...createState(createCoreState()),
            ...appStateFromNpmiState(createNpmiState()),
          },
        }),
      ],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
  });

  it('renders npmi violin filters component', () => {
    const fixture = TestBed.createComponent(ViolinFiltersComponent);
    fixture.detectChanges();

    const violinFilters = fixture.debugElement.query(
      By.css('.filters-toolbar')
    );
    expect(violinFilters).toBeTruthy();
  });

  it('dispatches toggle expanded action when hide button clicked', () => {
    const fixture = TestBed.createComponent(ViolinFiltersComponent);
    fixture.detectChanges();

    const hideButton = fixture.debugElement.query(By.css('button'));
    hideButton.nativeElement.click();
    fixture.detectChanges();

    expect(dispatchedActions).toEqual([
      npmiActions.npmiToggleSidebarExpanded(),
    ]);
  });
});
