/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {By} from '@angular/platform-browser';
import {BrowserDynamicTestingModule} from '@angular/platform-browser-dynamic/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {MatIconTestingModule} from '../../testing/mat_icon_module';
import {DataLoadState} from '../../types/data';
import {createSettings, createSettingsState, createState} from '../testing';
import {
  changeReloadPeriod,
  toggleReloadEnabled,
} from '../_redux/settings_actions';
import {getSettingsLoadState} from '../_redux/settings_selectors';
import {SettingsButtonComponent} from './settings_button_component';
import {SettingsButtonContainer} from './settings_button_container';
import {SettingsDialogComponent} from './settings_dialog_component';
import {SettingsDialogContainer} from './settings_dialog_container';

describe('settings test', () => {
  let store: MockStore;
  let dispatchSpy: jasmine.Spy;
  let overlayContainer: OverlayContainer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatButtonModule,
        MatCheckboxModule,
        MatDialogModule,
        MatIconTestingModule,
        MatInputModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
      ],
      providers: [
        provideMockStore({
          initialState: createState(
            createSettingsState({
              settings: createSettings({
                reloadPeriodInMs: 30000,
                reloadEnabled: true,
              }),
            })
          ),
        }),
      ],
      declarations: [
        SettingsDialogContainer,
        SettingsDialogComponent,
        SettingsButtonComponent,
        SettingsButtonContainer,
      ],
    }).compileComponents();
    store = TestBed.inject<Store>(Store) as MockStore;
    dispatchSpy = spyOn(store, 'dispatch');
    overlayContainer = TestBed.inject(OverlayContainer);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('opens a dialog when clicking on the button', async () => {
    const fixture = TestBed.createComponent(SettingsButtonContainer);
    fixture.detectChanges();

    const settingDialogsBefore = overlayContainer
      .getContainerElement()
      .querySelectorAll('settings-dialog');
    expect(settingDialogsBefore.length).toBe(0);

    fixture.debugElement.query(By.css('button')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const settingDialogsAfter = overlayContainer
      .getContainerElement()
      .querySelectorAll('settings-dialog');

    expect(settingDialogsAfter.length).toBe(1);
  });

  it('disables button until loaded', async () => {
    store.overrideSelector(getSettingsLoadState, DataLoadState.NOT_LOADED);
    const fixture = TestBed.createComponent(SettingsButtonContainer);
    fixture.detectChanges();
    const button = fixture.debugElement.query(By.css('button'));
    expect(button.attributes['disabled']).toBe('true');

    store.overrideSelector(getSettingsLoadState, DataLoadState.LOADING);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(button.attributes['disabled']).toBe('true');

    store.overrideSelector(getSettingsLoadState, DataLoadState.LOADED);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(button.attributes['disabled']).not.toBeDefined();
  });

  it('disables button until failed', async () => {
    store.overrideSelector(getSettingsLoadState, DataLoadState.NOT_LOADED);
    const fixture = TestBed.createComponent(SettingsButtonContainer);
    fixture.detectChanges();
    const button = fixture.debugElement.query(By.css('button'));
    expect(button.attributes['disabled']).toBe('true');

    store.overrideSelector(getSettingsLoadState, DataLoadState.FAILED);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(button.attributes['disabled']).not.toBeDefined();
  });

  it('renders settings', () => {
    const fixture = TestBed.createComponent(SettingsDialogContainer);
    fixture.detectChanges();

    const checkbox = fixture.debugElement.query(By.css('mat-checkbox input'));
    expect(checkbox.nativeElement.checked).toBe(true);

    const reloadPeriod = fixture.debugElement.query(By.css('.reload-period'));
    expect(reloadPeriod.nativeElement.value).toBe('30');
  });

  it('updates the UI according to store changes.', () => {
    const fixture = TestBed.createComponent(SettingsDialogContainer);
    fixture.detectChanges();

    // sanity to make sure it really did change.
    const checkbox = fixture.debugElement.query(By.css('mat-checkbox input'));
    expect(checkbox.nativeElement.checked).toBe(true);

    store.setState(
      createState(
        createSettingsState({
          settings: createSettings({
            reloadPeriodInMs: 60000,
            reloadEnabled: false,
          }),
        })
      )
    );
    fixture.detectChanges();

    expect(checkbox.nativeElement.checked).toBe(false);

    const reloadPeriod = fixture.debugElement.query(By.css('.reload-period'));
    expect(reloadPeriod.nativeElement.value).toBe('60');
  });

  describe('toggleReloadEnabled', () => {
    it('dispatches when clicking on checkbox', fakeAsync(() => {
      const fixture = TestBed.createComponent(SettingsDialogContainer);
      fixture.detectChanges();

      const checkbox = fixture.debugElement.query(By.css('mat-checkbox input'));
      checkbox.nativeElement.click();

      expect(dispatchSpy).toHaveBeenCalledWith(toggleReloadEnabled());
    }));
  });

  describe('changeReloadPeriod', () => {
    it('dispatches changing the value', fakeAsync(async () => {
      const fixture = TestBed.createComponent(SettingsDialogContainer);
      fixture.detectChanges();

      const reloadPeriod = fixture.debugElement.query(By.css('.reload-period'));
      reloadPeriod.nativeElement.value = 35;
      reloadPeriod.nativeElement.dispatchEvent(new Event('input'));

      expect(dispatchSpy).not.toHaveBeenCalled();

      // We debounce it so it does not spam other components on very keystroke.
      tick(500);

      expect(dispatchSpy).toHaveBeenCalledWith(
        changeReloadPeriod({periodInMs: 35000})
      );
    }));

    it('does not dispatch when input is invalid', fakeAsync(async () => {
      const fixture = TestBed.createComponent(SettingsDialogContainer);
      fixture.detectChanges();

      const reloadPeriod = fixture.debugElement.query(By.css('.reload-period'));
      reloadPeriod.nativeElement.value = 5;
      reloadPeriod.nativeElement.dispatchEvent(new Event('input'));

      tick(1e10);

      expect(dispatchSpy).not.toHaveBeenCalled();
    }));

    it('does not set state when reload is disabled', fakeAsync(() => {
      store.setState(
        createState(
          createSettingsState({
            settings: createSettings({
              reloadPeriodInMs: 30000,
              reloadEnabled: false,
            }),
          })
        )
      );
      const fixture = TestBed.createComponent(SettingsDialogContainer);
      fixture.detectChanges();

      const reloadPeriod = fixture.debugElement.query(By.css('.reload-period'));
      reloadPeriod.nativeElement.value = 30;
      reloadPeriod.nativeElement.dispatchEvent(new Event('input'));

      tick(1e10);

      expect(dispatchSpy).not.toHaveBeenCalled();
    }));
  });
});
