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
import {TestBed, ComponentFixture} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store, Action} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../../../../../app_state';
import {HeaderComponent} from './header_component';
import {HeaderContainer} from './header_container';
import * as npmiActions from '../../../actions';
import {SortingOrder} from '../../../store/npmi_types';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';
import {getAnnotationSorting} from '../../../store';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Annotations List Header Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  let fixture: ComponentFixture<HeaderContainer>;
  const css = {
    CHECKBOX_CONTAINER: By.css('.toggle-all-container'),
    ANNOTATIONS_HEADER_CONTAINER: By.css('.annotations-header-containers'),
    CHECKBOX: By.css('mat-checkbox'),
    HEADER: By.css('.header-clickable'),
    SORT_ICON: By.css('.sorting-icon'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderComponent, HeaderContainer],
      imports: [],
      providers: [
        provideMockStore({
          initialState: appStateFromNpmiState(createNpmiState()),
        }),
      ],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });

    fixture = TestBed.createComponent(HeaderContainer);
    fixture.componentInstance.activeMetrics = [
      'nPMI@test',
      'nPMI@test2',
      'nPMI_diff@(test-test2)',
    ];
    fixture.componentInstance.numAnnotations = 2;
    fixture.componentInstance.annotations = {
      annotation_1: [
        {
          annotation: 'annotation_1',
          metric: 'test',
          run: 'test',
          nPMIValue: 1.0,
          countValue: 100,
        },
      ],
      annotation_2: [
        {
          annotation: 'annotation_2',
          metric: 'test',
          run: 'test',
          nPMIValue: 1.0,
          countValue: 100,
        },
      ],
    };
    fixture.detectChanges();
  });

  it('renders checkbox and container', () => {
    const strippedMetrics = ['test', 'test2', '(test-test2)'];

    const checkboxContainer = fixture.debugElement.query(
      css.CHECKBOX_CONTAINER
    );
    expect(checkboxContainer).toBeTruthy();

    const checkbox = fixture.debugElement.query(css.CHECKBOX);
    expect(checkbox.nativeElement.checked).toBeFalsy();

    const headerContainer = fixture.debugElement.query(
      css.ANNOTATIONS_HEADER_CONTAINER
    );
    expect(headerContainer).toBeTruthy();

    const headerMetrics = fixture.debugElement.queryAll(css.HEADER);
    for (const index in strippedMetrics) {
      expect(headerMetrics[index].nativeElement.textContent.trim()).toBe(
        strippedMetrics[index]
      );
    }
  });

  it('renders sorting arrow when sorting active', () => {
    store.overrideSelector(getAnnotationSorting, {
      metric: 'nPMI@test',
      order: SortingOrder.DOWN,
    });
    fixture = TestBed.createComponent(HeaderContainer);
    fixture.componentInstance.activeMetrics = [
      'nPMI@test',
      'nPMI@test2',
      'nPMI_diff@(test-test2)',
    ];
    fixture.detectChanges();
    const headerMetric = fixture.debugElement.query(css.HEADER);
    expect(headerMetric.nativeElement.textContent.trim()).toBe('test');

    const sortingIcon = headerMetric.query(css.SORT_ICON);
    expect(headerMetric).toBeTruthy();
  });

  it('dispatches npmiSelectedAnnotations action with all annotations when checkbox is clicked', () => {
    const checkbox = fixture.debugElement.query(css.CHECKBOX);
    checkbox.triggerEventHandler('change', {checked: true});
    fixture.detectChanges();
    expect(dispatchedActions).toEqual([
      npmiActions.npmiSetSelectedAnnotations({
        annotations: ['annotation_1', 'annotation_2'],
      }),
    ]);
  });

  it('dispatches sortingChanged action when metric is clicked', () => {
    const headerMetric = fixture.debugElement.query(css.HEADER);
    headerMetric.nativeElement.click();
    fixture.detectChanges();
    expect(dispatchedActions).toEqual([
      npmiActions.npmiChangeAnnotationSorting({
        metric: 'nPMI@test',
      }),
    ]);
  });
});
