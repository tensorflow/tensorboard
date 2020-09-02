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
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Action, Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../../../../../app_state';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';
import {AnnotationComponent} from './annotation_component';
import {AnnotationContainer} from './annotation_container';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Annotations List Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  const css = {
    CHECKBOX: By.css('.annotation-checkbox'),
    FLAGGED_ICON: By.css('.flagged-icon'),
    HIDDEN_ICON: By.css('.hidden-icon'),
    RUN_INDICATORS: By.css('.hint'),
    RUN_HINT_TEXTS: By.css('.hint-text'),
    BARS: By.css('.bar'),
    COUNT_DOTS: By.css('.countDot'),
    NPMI_BACKGROUND_TEXTS: By.css('.npmi-background-text'),
    NPMI_TEXTS: By.css('.npmi-text'),
    COUNT_BACKGROUND_TEXTS: By.css('.count-background-text'),
    COUNT_TEXTS: By.css('.count-text'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnotationContainer, AnnotationComponent],
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
  });

  fit('renders annotation', () => {
    const fixture = TestBed.createComponent(AnnotationContainer);
    fixture.componentInstance.activeMetrics = [];
    fixture.componentInstance.data = [
      {
        annotation: 'annotation_1',
        metric: 'test',
        run: 'run_1',
        nPMIValue: 0.5178,
        countValue: 100,
      },
      {
        annotation: 'annotation_1',
        metric: 'other',
        run: 'run_1',
        nPMIValue: 0.02157,
        countValue: 101,
      },
      {
        annotation: 'annotation_1',
        metric: 'test',
        run: 'run_2',
        nPMIValue: null,
        countValue: null,
      },
      {
        annotation: 'annotation_1',
        metric: 'other',
        run: 'run_2',
        nPMIValue: -0.1,
        countValue: 53,
      },
    ];
    fixture.componentInstance.maxCount = 101;
    fixture.componentInstance.annotation = 'annotation_1';
    fixture.detectChanges();

    const selectedCheckbox = fixture.debugElement.query(css.CHECKBOX);
    expect(selectedCheckbox).toBeTruthy();
  });
});
