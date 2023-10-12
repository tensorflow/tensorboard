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
import {OverlayContainer} from '@angular/cdk/overlay';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {State} from '../core/store';
import {overrideEnableDarkModeChanged} from '../feature_flag/actions/feature_flag_actions';
import {getEnableDarkModeOverride} from '../selectors';
import {MatIconTestingModule} from '../testing/mat_icon_module';
import {provideMockTbStore} from '../testing/utils';
import {DarkModeToggleComponent} from './dark_mode_toggle_component';
import {DarkModeToggleContainer} from './dark_mode_toggle_container';

describe('dark mode toggle test', () => {
  let store: MockStore<State>;
  let overlayContainer: OverlayContainer;
  let dispatchedActions: Action[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatButtonModule,
        MatIconTestingModule,
        MatMenuModule,
        NoopAnimationsModule,
      ],
      providers: [provideMockTbStore()],
      declarations: [DarkModeToggleComponent, DarkModeToggleContainer],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getEnableDarkModeOverride, null);

    dispatchedActions = [];
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });

    overlayContainer = TestBed.inject(OverlayContainer);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  function getMenuButtons(fixture: ComponentFixture<DarkModeToggleContainer>) {
    const els = fixture.debugElement.queryAll(By.css('button'));
    expect(els.length).toBe(1);

    els[0].nativeElement.click();

    return Array.from(
      overlayContainer.getContainerElement().querySelectorAll('button')
    );
  }

  it('renders a menu button and a menu', () => {
    const fixture = TestBed.createComponent(DarkModeToggleContainer);
    fixture.detectChanges();

    const buttons = getMenuButtons(fixture);
    expect(
      buttons.map((button) => button.querySelector('label')!.textContent)
    ).toEqual(['Browser default', 'Light', 'Dark']);
  });

  it('renders appropriate icon for each mode', () => {
    const fixture = TestBed.createComponent(DarkModeToggleContainer);
    fixture.detectChanges();

    store.overrideSelector(getEnableDarkModeOverride, null);
    store.refreshState();
    fixture.detectChanges();
    const buttonEl = fixture.debugElement.query(By.css('button'));
    expect(buttonEl.nativeElement.textContent).toBe('brightness_6_24px');

    store.overrideSelector(getEnableDarkModeOverride, true);
    store.refreshState();
    fixture.detectChanges();
    expect(buttonEl.nativeElement.textContent).toBe('dark_mode_24px');

    store.overrideSelector(getEnableDarkModeOverride, false);
    store.refreshState();
    fixture.detectChanges();
    expect(buttonEl.nativeElement.textContent).toBe('light_mode_24px');
  });

  it('fires action when user clicks on a button', () => {
    const fixture = TestBed.createComponent(DarkModeToggleContainer);
    fixture.detectChanges();
    const buttons = getMenuButtons(fixture);

    buttons[2].click();
    buttons[1].click();
    buttons[0].click();
    expect(dispatchedActions).toEqual([
      overrideEnableDarkModeChanged({enableDarkMode: true}),
      overrideEnableDarkModeChanged({enableDarkMode: false}),
      overrideEnableDarkModeChanged({enableDarkMode: null}),
    ]);
  });
});
