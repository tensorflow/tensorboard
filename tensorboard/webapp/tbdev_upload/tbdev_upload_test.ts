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
import {Clipboard, ClipboardModule} from '@angular/cdk/clipboard';
import {OverlayContainer} from '@angular/cdk/overlay';
import {TestBed} from '@angular/core/testing';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../core/store';
import {TbdevUploadDialogComponent} from './tbdev_upload_dialog_component';
import {TbdevUploadButtonComponent} from './tbdev_upload_button_component';

import {createCoreState, createEnvironment, createState} from '../core/testing';
import {MatIconTestingModule} from '../testing/mat_icon.module';

describe('tbdev upload test', () => {
  let store: MockStore<State>;
  const clipboardSpy = jasmine.createSpyObj('Clipboard', ['copy']);
  let overlayContainer: OverlayContainer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ClipboardModule,
        MatButtonModule,
        MatDialogModule,
        MatIconTestingModule,
        NoopAnimationsModule,
      ],
      declarations: [TbdevUploadDialogComponent, TbdevUploadButtonComponent],
      providers: [
        provideMockStore({
          initialState: createState(
            createCoreState({
              environment: createEnvironment({
                data_location: '',
              }),
            })
          ),
        }),
        {provide: Clipboard, useValue: clipboardSpy},
      ],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    overlayContainer = TestBed.inject(OverlayContainer);
  });

  it('opens a dialog when clicking on the button', async () => {
    const fixture = TestBed.createComponent(TbdevUploadButtonComponent);
    fixture.detectChanges();

    const tbdevUploadDialogsBefore = overlayContainer
      .getContainerElement()
      .querySelectorAll('tbdev-upload-dialog');
    expect(tbdevUploadDialogsBefore.length).toBe(0);

    fixture.debugElement.query(By.css('button')).nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const tbdevUploadDialogsAfter = overlayContainer
      .getContainerElement()
      .querySelectorAll('tbdev-upload-dialog');

    expect(tbdevUploadDialogsAfter.length).toBe(1);
  });

  it('prints command and allows it to be copied', async () => {
    const fixture = TestBed.createComponent(TbdevUploadDialogComponent);
    fixture.detectChanges();

    const codeElement = fixture.debugElement.query(By.css('code'));
    expect(codeElement.nativeElement.textContent).toBe(
      'tensorboard dev upload --logdir {logdir}'
    );

    const copyElement = fixture.debugElement.query(By.css('.command-copy'));
    copyElement.nativeElement.click();

    expect(clipboardSpy.copy).toHaveBeenCalledWith(
      'tensorboard dev upload --logdir {logdir}'
    );
  });

  it('updates with data_location', async () => {
    const fixture = TestBed.createComponent(TbdevUploadDialogComponent);
    fixture.detectChanges();

    store.setState(
      createState(
        createCoreState({
          environment: createEnvironment({
            data_location: '/some/data/location',
          }),
        })
      )
    );
    fixture.detectChanges();

    const codeElement = fixture.debugElement.query(By.css('code'));
    expect(codeElement.nativeElement.textContent).toBe(
      'tensorboard dev upload --logdir \\\n    /some/data/location'
    );

    const copyElement = fixture.debugElement.query(By.css('.command-copy'));
    copyElement.nativeElement.click();

    expect(clipboardSpy.copy).toHaveBeenCalledWith(
      'tensorboard dev upload --logdir \\\n    /some/data/location'
    );
  });
});
