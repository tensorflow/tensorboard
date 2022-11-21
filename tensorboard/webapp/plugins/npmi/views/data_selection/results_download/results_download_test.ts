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
 * Unit tests for the Result Downloads.
 */
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../../app_state';
import {createCoreState, createState} from '../../../../../core/testing';
import * as selectors from '../../../../../selectors';
import {getFlaggedAnnotations} from '../../../store';
import {appStateFromNpmiState, createNpmiState} from '../../../testing';
import {ResultsDownloadComponent} from './results_download_component';
import {ResultsDownloadContainer} from './results_download_container';

describe('Npmi Results Download', () => {
  let store: MockStore<State>;
  const css = {
    DOWNLOAD_BUTTON: By.css('button'),
    DOWNLOAD_BUTTON_ACTIVE: By.css('.active-button'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultsDownloadComponent, ResultsDownloadContainer],
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

  it('renders disabled button when no annotations are flagged', () => {
    const fixture = TestBed.createComponent(ResultsDownloadContainer);
    fixture.detectChanges();

    const downloadButton = fixture.debugElement.query(css.DOWNLOAD_BUTTON);
    expect(downloadButton).toBeTruthy();
    expect(downloadButton.nativeElement.disabled).toBeTrue();

    const downloadButtonActive = fixture.debugElement.query(
      css.DOWNLOAD_BUTTON_ACTIVE
    );
    expect(downloadButtonActive).toBeNull();
  });

  it('renders enabled button when annotations are flagged', () => {
    store.overrideSelector(getFlaggedAnnotations, ['test', 'test2']);
    const fixture = TestBed.createComponent(ResultsDownloadContainer);
    fixture.detectChanges();

    const downloadButton = fixture.debugElement.query(css.DOWNLOAD_BUTTON);
    expect(downloadButton).toBeTruthy();
    expect(downloadButton.nativeElement.disabled).toBeFalse();

    const downloadButtonActive = fixture.debugElement.query(
      css.DOWNLOAD_BUTTON_ACTIVE
    );
    expect(downloadButtonActive).toBeTruthy();
  });
});
