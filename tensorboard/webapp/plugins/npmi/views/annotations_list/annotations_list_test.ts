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
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../app_state';
import {createCoreState, createState} from '../../../../core/testing';
import * as selectors from '../../../../selectors';
import {getAnnotationsExpanded} from '../../store';
import {appStateFromNpmiState, createNpmiState} from '../../testing';
import {AnnotationsListComponent} from './annotations_list_component';
import {AnnotationsListContainer} from './annotations_list_container';

describe('Npmi Annotations List Container', () => {
  let store: MockStore<State>;
  const css = {
    TOOLBAR: By.css('npmi-annotations-list-toolbar'),
    HEADER: By.css('npmi-annotations-list-header'),
    LEGEND: By.css('npmi-annotations-legend'),
    ROWS: By.css('.annotation-rows'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnotationsListComponent, AnnotationsListContainer],
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
      selectors.getCurrentRouteRunSelection,
      new Map<string, boolean>()
    );
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders expanded annotations list', () => {
    const fixture = TestBed.createComponent(AnnotationsListContainer);
    fixture.detectChanges();

    const annotationsToolbar = fixture.debugElement.query(css.TOOLBAR);
    expect(annotationsToolbar).toBeTruthy();
  });

  it('renders non-expanded annotations list', () => {
    store.overrideSelector(getAnnotationsExpanded, false);
    const fixture = TestBed.createComponent(AnnotationsListContainer);
    fixture.detectChanges();

    const annotationsToolbar = fixture.debugElement.query(css.TOOLBAR);
    expect(annotationsToolbar).toBeTruthy();

    const rows = fixture.debugElement.query(css.ROWS);
    expect(rows).toBeFalsy();
  });
});
