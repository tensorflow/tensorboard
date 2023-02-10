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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../../app_state';
import * as npmiActions from '../../../actions';
import {getSelectedAnnotations} from '../../../store';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';
import {AnnotationsListToolbarComponent} from './annotations_list_toolbar_component';
import {AnnotationsListToolbarContainer} from './annotations_list_toolbar_container';

describe('Npmi Annotations List Toolbar Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  const css = {
    TITLE: By.css('.annotations-title'),
    BUTTON: By.css('button'),
    ICON: By.css('mat-icon'),
    EXPAND_BUTTON: By.css('.expand-button'),
    TOGGLE: By.css('mat-slide-toggle'),
    ANNOTATIONS_SEARCH: By.css('npmi-annotations-search'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AnnotationsListToolbarComponent,
        AnnotationsListToolbarContainer,
      ],
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

  it('renders toolbar in non-expanded state', () => {
    const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
    fixture.componentInstance.numAnnotations = 3;
    fixture.componentInstance.expanded = false;
    fixture.detectChanges();

    const title = fixture.debugElement.query(css.TITLE);
    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent.trim()).toBe('Annotations (3)');

    const buttons = fixture.debugElement.queryAll(css.BUTTON);
    expect(buttons.length).toBe(1);

    const expandButton = fixture.debugElement.query(css.EXPAND_BUTTON);
    expect(expandButton).toBeTruthy();

    const toggles = fixture.debugElement.queryAll(css.TOGGLE);
    expect(toggles.length).toBe(0);

    const annotationsSearch = fixture.debugElement.query(
      css.ANNOTATIONS_SEARCH
    );
    expect(annotationsSearch).toBeNull();
  });

  it('renders toolbar in expanded state with no annotations selected', () => {
    const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
    fixture.componentInstance.numAnnotations = 3;
    fixture.componentInstance.expanded = true;
    fixture.detectChanges();

    const title = fixture.debugElement.query(css.TITLE);
    expect(title).toBeTruthy();
    expect(title.nativeElement.textContent.trim()).toBe('Annotations (3)');

    const buttons = fixture.debugElement.queryAll(css.BUTTON);
    expect(buttons.length).toBe(3);
    expect(buttons[0].nativeElement.disabled).toBeTrue();
    expect(buttons[1].nativeElement.disabled).toBeTrue();

    const expandButton = fixture.debugElement.query(css.EXPAND_BUTTON);
    expect(expandButton).toBeTruthy();

    const toggles = fixture.debugElement.queryAll(css.TOGGLE);
    expect(toggles.length).toBe(2);

    const annotationsSearch = fixture.debugElement.query(
      css.ANNOTATIONS_SEARCH
    );
    expect(annotationsSearch).toBeTruthy();
  });

  it('renders toolbar in expanded state with annotations selected', () => {
    store.overrideSelector(getSelectedAnnotations, ['test', 'test2']);
    const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
    fixture.componentInstance.expanded = true;
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(css.BUTTON);
    expect(buttons.length).toBe(3);
    expect(buttons[0].nativeElement.disabled).toBeFalse();
    expect(buttons[1].nativeElement.disabled).toBeFalse();
  });

  describe('interacting with flagging and hiding', () => {
    it('dispatches action when annotations are flagged', () => {
      store.overrideSelector(getSelectedAnnotations, ['test', 'test2']);
      const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
      fixture.componentInstance.expanded = true;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(css.BUTTON);
      buttons[0].nativeElement.click();
      expect(dispatchedActions).toEqual([
        npmiActions.npmiToggleAnnotationFlags({annotations: ['test', 'test2']}),
      ]);
    });

    it('dispatches action when annotations are hidden', () => {
      store.overrideSelector(getSelectedAnnotations, ['test', 'test2']);
      const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
      fixture.componentInstance.expanded = true;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(css.BUTTON);
      buttons[1].nativeElement.click();
      expect(dispatchedActions).toEqual([
        npmiActions.npmiToggleAnnotationsHidden({
          annotations: ['test', 'test2'],
        }),
      ]);
    });
  });

  it('dispatches toggleExpanded when toggled', () => {
    const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
    fixture.detectChanges();

    const expandButton = fixture.debugElement.query(css.EXPAND_BUTTON);
    expandButton.nativeElement.click();

    expect(dispatchedActions).toEqual([
      npmiActions.npmiToggleAnnotationsExpanded(),
    ]);
  });

  describe('interacting with toggles', () => {
    it('dispatches toggleShowCounts when toggled', () => {
      const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
      fixture.componentInstance.expanded = true;
      fixture.detectChanges();

      const toggles = fixture.debugElement.queryAll(css.TOGGLE);
      toggles[0].triggerEventHandler('change', null);

      expect(dispatchedActions).toEqual([npmiActions.npmiShowCountsToggled()]);
    });

    it('dispatches toggleShowHidden when toggled', () => {
      const fixture = TestBed.createComponent(AnnotationsListToolbarContainer);
      fixture.componentInstance.expanded = true;
      fixture.detectChanges();

      const toggles = fixture.debugElement.queryAll(css.TOGGLE);
      toggles[1].triggerEventHandler('change', null);

      expect(dispatchedActions).toEqual([
        npmiActions.npmiShowHiddenAnnotationsToggled(),
      ]);
    });
  });
});
