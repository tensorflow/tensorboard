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
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../core/store';
import {createCoreState, createEnvironment, createState} from '../core/testing';
import {MatIconTestingModule} from '../testing/mat_icon_module';
import {TbdevUploadButtonComponent} from './tbdev_upload_button_component';
import {TbdevUploadDialogComponent} from './tbdev_upload_dialog_component';
import {TbdevUploadDialogContainer} from './tbdev_upload_dialog_container';

describe('tbdev upload test', () => {
  let store: MockStore<State>;
  const clipboardSpy = jasmine.createSpyObj('Clipboard', ['copy']);
  const fakeWindow: any = {};
  const matDialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
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
      declarations: [
        TbdevUploadButtonComponent,
        TbdevUploadDialogComponent,
        TbdevUploadDialogContainer,
      ],
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
        {provide: 'window', useValue: fakeWindow},
        {provide: MatDialogRef, useValue: matDialogRefSpy},
      ],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    overlayContainer = TestBed.inject(OverlayContainer);
    fakeWindow.location = {
      hostname: 'localhost',
    };
  });

  it('does not show upload button if hostname is not localhost', async () => {
    fakeWindow.location.hostname = 'notlocalhost.com';
    const fixture = TestBed.createComponent(TbdevUploadButtonComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.classes['shown']).toBeUndefined();
    expect(fixture.debugElement.children.length).toEqual(0);
  });

  it('shows upload button if hostname is localhost', async () => {
    fakeWindow.location.hostname = 'localhost';
    const fixture = TestBed.createComponent(TbdevUploadButtonComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.classes['shown']).toBeDefined();
    expect(fixture.debugElement.children.length).toEqual(1);
  });

  it('shows upload button if hostname is 127.0.0.1', async () => {
    fakeWindow.location.hostname = '127.0.0.1';
    const fixture = TestBed.createComponent(TbdevUploadButtonComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.classes['shown']).toBeDefined();
    expect(fixture.debugElement.children.length).toEqual(1);
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
    const fixture = TestBed.createComponent(TbdevUploadDialogContainer);
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
    const fixture = TestBed.createComponent(TbdevUploadDialogContainer);
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
      "tensorboard dev upload --logdir \\\n    '/some/data/location'"
    );

    const copyElement = fixture.debugElement.query(By.css('.command-copy'));
    copyElement.nativeElement.click();

    expect(clipboardSpy.copy).toHaveBeenCalledWith(
      "tensorboard dev upload --logdir \\\n    '/some/data/location'"
    );
  });

  it('escapes single quotes in data_location', async () => {
    const fixture = TestBed.createComponent(TbdevUploadDialogContainer);
    fixture.detectChanges();

    store.setState(
      createState(
        createCoreState({
          environment: createEnvironment({
            data_location: "/loc' || echo $PWD'",
          }),
        })
      )
    );
    fixture.detectChanges();

    const codeElement = fixture.debugElement.query(By.css('code'));
    expect(codeElement.nativeElement.textContent).toBe(
      "tensorboard dev upload --logdir \\\n    '/loc'\\'' || echo $PWD'\\'''"
    );
  });

  it('can be closed with button', async () => {
    const fixture = TestBed.createComponent(TbdevUploadDialogContainer);
    fixture.detectChanges();

    const copyElement = fixture.debugElement.query(By.css('.close-button'));
    copyElement.nativeElement.click();
    expect(matDialogRefSpy.close).toHaveBeenCalled();
  });
});
