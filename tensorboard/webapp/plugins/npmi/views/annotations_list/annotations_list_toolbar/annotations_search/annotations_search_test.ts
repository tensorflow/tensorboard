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
 * Unit tests for the Annotations Search.
 */
import {CommonModule} from '@angular/common';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {By} from '@angular/platform-browser';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../../../app_state';
import * as npmiActions from '../../../../actions';
import {getAnnotationsRegex} from '../../../../store';
import {appStateFromNpmiState, createNpmiState} from '../../../../testing';
import {AnnotationsSearchComponent} from './annotations_search_component';
import {AnnotationsSearchContainer} from './annotations_search_container';

describe('Npmi Annotations Search Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  const css = {
    ERROR_ICON: By.css('.error-icon'),
    INPUT: By.css('input'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnotationsSearchComponent, AnnotationsSearchContainer],
      imports: [CommonModule, FormsModule, MatInputModule],
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

  it('renders npmi annotations search component', () => {
    const fixture = TestBed.createComponent(AnnotationsSearchContainer);
    fixture.detectChanges();

    const filterDiv = fixture.debugElement.query(css.INPUT);
    expect(filterDiv).toBeTruthy();

    expect(fixture.debugElement.query(css.ERROR_ICON)).toBeNull();
  });

  describe('input interaction', () => {
    it('dispatches changeAnnotationsRegex when typing on input', () => {
      const fixture = TestBed.createComponent(AnnotationsSearchContainer);
      fixture.detectChanges();

      const input = fixture.debugElement.query(css.INPUT);
      input.nativeElement.focus();
      fixture.detectChanges();

      input.nativeElement.value = 'a';
      input.nativeElement.dispatchEvent(new InputEvent('input', {data: 'a'}));
      fixture.detectChanges();

      expect(dispatchedActions).toEqual([
        npmiActions.npmiAnnotationsRegexChanged({regex: 'a'}),
      ]);
    });
  });

  it('shows error icon for an invalid regex', () => {
    store.overrideSelector(getAnnotationsRegex, '*');
    const fixture = TestBed.createComponent(AnnotationsSearchContainer);
    fixture.detectChanges();

    expect(fixture.debugElement.query(css.ERROR_ICON)).not.toBeNull();
  });
});
