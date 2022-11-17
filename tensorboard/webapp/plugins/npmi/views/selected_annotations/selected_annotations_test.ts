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
 * Unit tests for the Selected Annotations.
 */
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../app_state';
import * as npmiActions from '../../actions';
import {getPCExpanded, getSelectedAnnotations} from '../../store';
import {appStateFromNpmiState, createNpmiState} from '../../testing';
import {SelectedAnnotationsComponent} from './selected_annotations_component';
import {SelectedAnnotationsContainer} from './selected_annotations_container';

describe('Npmi Selected Annotations', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  const css = {
    TITLE: By.css('.pc-title'),
    BUTTONS: By.css('button'),
    EXPAND_ICON: By.css('.expand-icon'),
    EXPAND_LESS_ICON: By.css('.expand-less-icon'),
    CLEAR_BUTTON: By.css('.clear-button'),
    EXPAND_BUTTON: By.css('.expand-button'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        SelectedAnnotationsComponent,
        SelectedAnnotationsContainer,
      ],
      imports: [],
      providers: [
        provideMockStore({
          initialState: appStateFromNpmiState(createNpmiState()),
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders selected annotations component expanded', () => {
    const fixture = TestBed.createComponent(SelectedAnnotationsContainer);
    fixture.detectChanges();

    const title = fixture.debugElement.query(css.TITLE);
    expect(title.nativeElement.textContent.trim()).toBe('Selected Annotations');

    const buttons = fixture.debugElement.queryAll(css.BUTTONS);
    expect(buttons.length).toBe(2);

    const expandIcon = fixture.debugElement.query(css.EXPAND_ICON);
    expect(expandIcon).toBeNull();

    const expandLessIcon = fixture.debugElement.query(css.EXPAND_LESS_ICON);
    expect(expandLessIcon).toBeTruthy();
  });

  it('renders selected annotations component not expanded', () => {
    store.overrideSelector(getPCExpanded, false);
    const fixture = TestBed.createComponent(SelectedAnnotationsContainer);
    fixture.detectChanges();

    const title = fixture.debugElement.query(css.TITLE);
    expect(title.nativeElement.textContent.trim()).toBe('Selected Annotations');

    const buttons = fixture.debugElement.queryAll(css.BUTTONS);
    expect(buttons.length).toBe(2);

    const expandIcon = fixture.debugElement.query(css.EXPAND_ICON);
    expect(expandIcon).toBeTruthy();

    const expandLessIcon = fixture.debugElement.query(css.EXPAND_LESS_ICON);
    expect(expandLessIcon).toBeNull();
  });

  it('dispatches toggle expanded when button clicked', () => {
    const fixture = TestBed.createComponent(SelectedAnnotationsContainer);
    fixture.detectChanges();

    const toggleButton = fixture.debugElement.query(css.EXPAND_BUTTON);
    toggleButton.nativeElement.click();

    expect(dispatchedActions).toEqual([
      npmiActions.npmiToggleParallelCoordinatesExpanded(),
    ]);
  });

  it('dispatches clear selected when button clicked', () => {
    store.overrideSelector(getSelectedAnnotations, ['test', 'test2']);
    const fixture = TestBed.createComponent(SelectedAnnotationsContainer);
    fixture.detectChanges();

    const clearButton = fixture.debugElement.query(css.CLEAR_BUTTON);
    clearButton.nativeElement.click();

    expect(dispatchedActions).toEqual([
      npmiActions.npmiClearSelectedAnnotations(),
    ]);
  });

  it('does not dispatch clear selected when nothing selected', () => {
    const fixture = TestBed.createComponent(SelectedAnnotationsContainer);
    fixture.detectChanges();

    const clearButton = fixture.debugElement.query(css.CLEAR_BUTTON);
    clearButton.nativeElement.click();

    expect(dispatchedActions).toEqual([]);
  });
});
