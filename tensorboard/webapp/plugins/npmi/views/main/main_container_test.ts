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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../app_state';
import {createCoreState, createState} from '../../../../core/testing';
import * as npmiActions from '../../actions';
import {getSidebarExpanded} from '../../store';
import {appStateFromNpmiState, createNpmiState} from '../../testing';
import {getCurrentRouteRunSelection} from './../../../../selectors';
import {MainComponent} from './main_component';
import {MainContainer} from './main_container';

describe('Npmi Main Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  const css = {
    ANALYSIS_CONTAINER: By.css('.analysis-container'),
    SIDEBAR_CONTAINER: By.css('.sidebar-container'),
    SIDE_TOGGLE: By.css('.side-toggle'),
    GRABBER: By.css('.grabber'),
    CONTENT: By.css('.content'),
    RUN_SELECTOR: By.css('runs-selector'),
    BUTTON: By.css('button'),
  };

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
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map<string, boolean>()
    );

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders npmi main component without runs', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map<string, boolean>()
    );
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const runsElement = fixture.debugElement.query(css.RUN_SELECTOR);
    expect(runsElement).toBeTruthy();

    const analysisElement = fixture.debugElement.query(css.ANALYSIS_CONTAINER);
    expect(analysisElement).toBeNull();
  });

  it('renders npmi main component with run', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([['run_1', true]])
    );
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const runsElement = fixture.debugElement.query(css.RUN_SELECTOR);
    expect(runsElement).toBeTruthy();

    const analysisElement = fixture.debugElement.query(css.ANALYSIS_CONTAINER);
    expect(analysisElement).toBeTruthy();
  });

  it('renders npmi main component without active run', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([['run_1', false]])
    );
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const runsElement = fixture.debugElement.query(css.RUN_SELECTOR);
    expect(runsElement).toBeTruthy();

    const analysisElement = fixture.debugElement.query(css.ANALYSIS_CONTAINER);
    expect(analysisElement).toBeNull();
  });

  it('renders npmi main component with multiple runs, some active, some inactive', () => {
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map([
        ['run_1', false],
        ['run_2', true],
        ['run_3', false],
      ])
    );
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const runsElement = fixture.debugElement.query(css.RUN_SELECTOR);
    expect(runsElement).toBeTruthy();

    const analysisElement = fixture.debugElement.query(css.ANALYSIS_CONTAINER);
    expect(analysisElement).toBeTruthy();
  });

  it('does not render sidebar or grabber when sidebar hidden', () => {
    store.overrideSelector(getSidebarExpanded, false);
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const sidebarElement = fixture.debugElement.query(css.SIDEBAR_CONTAINER);
    expect(sidebarElement).toBeNull();
    const grabber = fixture.debugElement.query(css.GRABBER);
    expect(grabber).toBeNull();
  });

  it('dispatches sidebar toggle when disabled and toggle button clicked', () => {
    store.overrideSelector(getSidebarExpanded, false);
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();
    const sideToggle = fixture.debugElement.query(css.SIDE_TOGGLE);
    expect(sideToggle).toBeTruthy();
    const expansionButton = sideToggle.query(css.BUTTON);
    expansionButton.nativeElement.click();

    expect(dispatchedActions).toEqual([
      npmiActions.npmiToggleSidebarExpanded(),
    ]);
  });

  it('renders sidebar and grabber when enabled', () => {
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const sidebarElement = fixture.debugElement.query(css.SIDEBAR_CONTAINER);
    expect(sidebarElement).toBeTruthy();
    const grabberElement = fixture.debugElement.query(css.GRABBER);
    expect(grabberElement).toBeTruthy();
    const sideToggle = fixture.debugElement.query(css.SIDE_TOGGLE);
    expect(sideToggle).toBeNull();
  });

  it('dispatches change sidebarWidth when interacted with grabber', () => {
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const grabberElement = fixture.debugElement.query(css.GRABBER);
    grabberElement.triggerEventHandler('mousedown', {clientX: 301});
    const contentElement = fixture.debugElement.query(css.CONTENT);
    contentElement.triggerEventHandler('mousemove', {clientX: 50});
    expect(dispatchedActions).toEqual([
      npmiActions.npmiSidebarWidthChanged({sidebarWidth: 50}),
    ]);
  });

  it('does not dispatch change sidebarWidth when grabber not selected', () => {
    const fixture = TestBed.createComponent(MainContainer);
    fixture.detectChanges();

    const contentElement = fixture.debugElement.query(css.CONTENT);
    contentElement.triggerEventHandler('mousemove', {clientX: 50});
    expect(dispatchedActions).toEqual([]);
  });
});
