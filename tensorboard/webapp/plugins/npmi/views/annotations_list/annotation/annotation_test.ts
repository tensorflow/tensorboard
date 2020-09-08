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

import {Action, Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {MatCheckboxModule} from '@angular/material/checkbox';

import {State} from '../../../../../app_state';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';
import {AnnotationComponent} from './annotation_component';
import {AnnotationContainer} from './annotation_container';
import {
  getSelectedAnnotations,
  getFlaggedAnnotations,
  getHiddenAnnotations,
  getShowCounts,
} from '../../../store';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Npmi Annotations List Row', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  function createComponentInstance(): ComponentFixture<AnnotationContainer> {
    const fixture = TestBed.createComponent(AnnotationContainer);
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
    fixture.componentInstance.activeMetrics = ['nPMI@test', 'nPMI@other'];
    fixture.componentInstance.runHeight = 30;
    fixture.componentInstance.maxCount = 101;
    fixture.componentInstance.annotation = 'annotation_1';
    fixture.componentInstance.numActiveRuns = 2;
    return fixture;
  }

  const css = {
    FLAGGED_ANNOTATION: By.css('.flagged-annotation'),
    HIDDEN_ANNOTATION: By.css('.hidden-annotation'),
    CHECKBOX: By.css('.annotation-checkbox'),
    CHECKBOX_CHECKED: 'mat-checkbox-checked',
    FLAGGED_ICON: By.css('.flagged-icon'),
    HIDDEN_ICON: By.css('.hidden-icon'),
    RUN_INDICATORS: By.css('.hint'),
    RUN_HINT_TEXTS: By.css('.hint-text'),
    BARS: By.css('.bar'),
    COUNT_DOTS: By.css('.count-dot'),
    NPMI_BACKGROUND_TEXTS: By.css('.npmi-background-text'),
    NPMI_TEXTS: By.css('.npmi-text'),
    COUNT_BACKGROUND_TEXTS: By.css('.count-background-text'),
    COUNT_TEXTS: By.css('.count-text'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnotationContainer, AnnotationComponent],
      imports: [MatCheckboxModule],
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

  it('renders annotation', () => {
    const fixture = createComponentInstance();
    fixture.detectChanges();

    const flaggedAnnotation = fixture.debugElement.query(
      css.FLAGGED_ANNOTATION
    );
    expect(flaggedAnnotation).toBeFalsy();

    const hiddenAnnotation = fixture.debugElement.query(css.HIDDEN_ANNOTATION);
    expect(hiddenAnnotation).toBeFalsy();

    const selectedCheckbox = fixture.debugElement.query(css.CHECKBOX);
    expect(selectedCheckbox).toBeTruthy();
    expect(selectedCheckbox.classes[css.CHECKBOX_CHECKED]).toBeFalsy();

    const flagIcon = fixture.debugElement.query(css.FLAGGED_ICON);
    expect(flagIcon).toBeFalsy();

    const hiddenIcon = fixture.debugElement.query(css.HIDDEN_ICON);
    expect(hiddenIcon).toBeFalsy();

    const runIndicators = fixture.debugElement.queryAll(css.RUN_INDICATORS);
    expect(runIndicators.length).toBe(2);

    const runHinTexts = fixture.debugElement.queryAll(css.RUN_INDICATORS);
    expect(runHinTexts.length).toBe(2);

    const bars = fixture.debugElement.queryAll(css.BARS);
    expect(bars.length).toBe(4);

    const dots = fixture.debugElement.queryAll(css.COUNT_DOTS);
    expect(dots.length).toBe(4);

    const npmiBackgroundTexts = fixture.debugElement.queryAll(
      css.NPMI_BACKGROUND_TEXTS
    );
    expect(npmiBackgroundTexts.length).toBe(4);

    const npmiTexts = fixture.debugElement.queryAll(css.NPMI_TEXTS);
    expect(npmiTexts.length).toBe(4);

    const countBackgroundTexts = fixture.debugElement.queryAll(
      css.COUNT_BACKGROUND_TEXTS
    );
    expect(countBackgroundTexts.length).toBe(4);

    const countTexts = fixture.debugElement.queryAll(css.COUNT_TEXTS);
    expect(countTexts.length).toBe(4);
  });

  it('renders selected annotation', () => {
    store.overrideSelector(getSelectedAnnotations, ['annotation_1']);
    const fixture = createComponentInstance();
    fixture.detectChanges();

    const selectedCheckbox = fixture.debugElement.query(css.CHECKBOX);
    expect(selectedCheckbox).toBeTruthy();
    expect(selectedCheckbox.classes[css.CHECKBOX_CHECKED]).toBeTrue();
  });

  it('renders flagged annotation', () => {
    store.overrideSelector(getFlaggedAnnotations, ['annotation_1']);
    const fixture = createComponentInstance();
    fixture.detectChanges();

    const flaggedAnnotation = fixture.debugElement.query(
      css.FLAGGED_ANNOTATION
    );
    expect(flaggedAnnotation).toBeTruthy();

    const flagIcon = fixture.debugElement.query(css.FLAGGED_ICON);
    expect(flagIcon).toBeTruthy();
  });

  it('renders hidden annotation', () => {
    store.overrideSelector(getHiddenAnnotations, ['annotation_1']);
    const fixture = createComponentInstance();
    fixture.detectChanges();

    const hiddenAnnotation = fixture.debugElement.query(css.HIDDEN_ANNOTATION);
    expect(hiddenAnnotation).toBeTruthy();

    const hiddenIcon = fixture.debugElement.query(css.HIDDEN_ICON);
    expect(hiddenIcon).toBeTruthy();
  });

  it('renders annotation that is both flagged and hidden', () => {
    store.overrideSelector(getHiddenAnnotations, ['annotation_1']);
    store.overrideSelector(getFlaggedAnnotations, ['annotation_1']);
    const fixture = createComponentInstance();
    fixture.detectChanges();

    const flaggedAnnotation = fixture.debugElement.query(
      css.FLAGGED_ANNOTATION
    );
    expect(flaggedAnnotation).toBeTruthy();

    const flagIcon = fixture.debugElement.query(css.FLAGGED_ICON);
    expect(flagIcon).toBeTruthy();

    const hiddenAnnotation = fixture.debugElement.query(css.HIDDEN_ANNOTATION);
    expect(hiddenAnnotation).toBeFalsy();

    const hiddenIcon = fixture.debugElement.query(css.HIDDEN_ICON);
    expect(hiddenIcon).toBeTruthy();
  });

  it('does not render the counts when not active', () => {
    store.overrideSelector(getShowCounts, false);
    const fixture = createComponentInstance();
    fixture.detectChanges();

    const dots = fixture.debugElement.queryAll(css.COUNT_DOTS);
    expect(dots.length).toBe(0);

    const countBackgroundTexts = fixture.debugElement.queryAll(
      css.COUNT_BACKGROUND_TEXTS
    );
    expect(countBackgroundTexts.length).toBe(0);

    const countTexts = fixture.debugElement.queryAll(css.COUNT_TEXTS);
    expect(countTexts.length).toBe(0);
  });
});
