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
import {NO_ERRORS_SCHEMA} from '@angular/core';

import {Store, Action} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../../../../app_state';
import {getRunSelection} from './../../../../core/store/core_selectors';
import {getSidebarExpanded} from '../../store';
import {appStateFromNpmiState, createNpmiState} from '../../testing';
import {createState, createCoreState} from '../../../../core/testing';
import {MainComponent} from './main_component';
import {MainContainer} from './main_container';
import * as npmiActions from '../../actions';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Main Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MainComponent, MainContainer],
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

  it('renders npmi main component without runs', () => {
    store.overrideSelector(getRunSelection, new Map());
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const runsElement = fixture.debugElement.query(
      By.css('tb-legacy-runs-selector')
    );
    expect(runsElement).toBeTruthy();

    const analysisElement = fixture.debugElement.query(
      By.css('.analysis-container')
    );
    expect(analysisElement).toBeNull();
  });

  it('renders npmi main component with run', () => {
    store.overrideSelector(getRunSelection, new Map([['run_1', true]]));
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const runsElement = fixture.debugElement.query(
      By.css('tb-legacy-runs-selector')
    );
    expect(runsElement).toBeTruthy();

    const analysisElement = fixture.debugElement.query(
      By.css('.analysis-container')
    );
    expect(analysisElement).toBeTruthy();
  });

  it('dispatches sidebar toggle when disabled and toggle button clicked', () => {
    store.overrideSelector(getSidebarExpanded, false);
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const sidebarElement = fixture.debugElement.query(
      By.css('.sidebar-container')
    );
    expect(sidebarElement).toBeNull();
    const sideToggle = fixture.debugElement.query(By.css('.side-toggle'));
    expect(sideToggle).toBeTruthy();
    const expansionButton = sideToggle.query(By.css('button'));
    expansionButton.nativeElement.click();

    expect(dispatchedActions).toEqual([
      npmiActions.npmiToggleSidebarExpanded(),
    ]);
  });

  it('renders sidebar and grabber when enabled', () => {
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const sidebarElement = fixture.debugElement.query(
      By.css('.sidebar-container')
    );
    expect(sidebarElement).toBeTruthy();
    const grabberElement = fixture.debugElement.query(By.css('.grabber'));
    expect(grabberElement).toBeTruthy();
  });

  it('dispatches change sidebarWidth when interacted with grabber', () => {
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const grabberElement = fixture.debugElement.query(By.css('.grabber'));
    grabberElement.triggerEventHandler('mousedown', {clientX: 301});
    const contentElement = fixture.debugElement.query(By.css('.content'));
    contentElement.triggerEventHandler('mousemove', {clientX: 50});
    expect(dispatchedActions).toEqual([
      npmiActions.npmiChangeSidebarWidth({sidebarWidth: 50}),
    ]);
  });
});
