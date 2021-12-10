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
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../app_state';
import {polymerInteropRunSelectionChanged} from '../../../core/actions';
import {createCoreState, createState} from '../../../core/testing';
import {LegacyRunsSelectorComponent} from './legacy_runs_selector_component';
import {LegacyRunsSelectorContainer} from './legacy_runs_selector_container';

describe('legacy_runs_selector test', () => {
  let store: MockStore<State>;
  let recordedActions: Action[];
  let testableRunSelector: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      providers: [
        provideMockStore({
          initialState: createState(createCoreState({})),
        }),
      ],
      declarations: [LegacyRunsSelectorContainer, LegacyRunsSelectorComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;

    recordedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      recordedActions.push(action);
    });

    testableRunSelector = document.createElement('div');
    testableRunSelector.classList.add('test');
    spyOn(document, 'createElement')
      .and.callThrough()
      .withArgs('tf-runs-selector')
      .and.returnValue(testableRunSelector);
  });

  it('creates the tf-runs-selector', () => {
    const fixture = TestBed.createComponent(LegacyRunsSelectorContainer);
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('.test'));

    expect(element.nativeElement).toBe(testableRunSelector);
  });

  it('dispatches initial selection from the Polymer component', () => {
    (testableRunSelector as any).selectedRuns = ['foo'];
    const fixture = TestBed.createComponent(LegacyRunsSelectorContainer);
    fixture.detectChanges();

    expect(recordedActions).toEqual([
      polymerInteropRunSelectionChanged({
        nextSelection: ['foo'],
      }),
    ]);
  });

  it('dispatches action when polymer component dispatches change', () => {
    (testableRunSelector as any).selectedRuns = ['foo'];
    const fixture = TestBed.createComponent(LegacyRunsSelectorContainer);
    fixture.detectChanges();

    const event = new CustomEvent('selected-runs-changed', {
      detail: {
        value: ['foo', 'bar'],
      },
    });
    testableRunSelector.dispatchEvent(event);

    expect(recordedActions).toEqual([
      jasmine.any(Object),
      polymerInteropRunSelectionChanged({
        nextSelection: ['foo', 'bar'],
      }),
    ]);
  });
});
