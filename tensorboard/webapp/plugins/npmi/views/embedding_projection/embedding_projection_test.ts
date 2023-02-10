/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {appStateFromNpmiState, createNpmiState} from '../../testing';
import {getEmbeddingsSidebarExpanded} from './../../store';
import {EmbeddingProjectionComponent} from './embedding_projection_component';
import {EmbeddingProjectionContainer} from './embedding_projection_container';

describe('Npmi Embedding Projection Container', () => {
  let store: MockStore<State>;
  let dispatchedActions: Action[];
  const css = {
    EMBEDDING_PROJECTION_TOOLBAR: By.css('.embedding-projection-toolbar'),
    SIDE_TOGGLE: By.css('.side-toggle'),
    BUTTON: By.css('button'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        EmbeddingProjectionContainer,
        EmbeddingProjectionComponent,
      ],
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

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders npmi embedding projection component', () => {
    const fixture = TestBed.createComponent(EmbeddingProjectionContainer);
    fixture.detectChanges();

    const embeddingProjection = fixture.debugElement.query(
      css.EMBEDDING_PROJECTION_TOOLBAR
    );
    expect(embeddingProjection).toBeTruthy();
  });

  it('dispatches toggle expanded action when hide button clicked', () => {
    store.overrideSelector(getEmbeddingsSidebarExpanded, true);
    const fixture = TestBed.createComponent(EmbeddingProjectionContainer);
    fixture.detectChanges();

    const sideToggle = fixture.debugElement.query(css.SIDE_TOGGLE);
    expect(sideToggle).toBeTruthy();
    const hideButton = sideToggle.query(css.BUTTON);
    expect(hideButton).toBeTruthy();
    hideButton.nativeElement.click();

    expect(dispatchedActions).toEqual([
      npmiActions.npmiEmbeddingsSidebarExpandedToggled(),
    ]);
  });
});
