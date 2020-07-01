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

import {MatIconTestingModule} from '../testing/mat_icon.module';
import {TbdevUploadDialogComponent} from './tbdev_upload_dialog_component';
import {TbdevUploadButtonComponent} from './tbdev_upload_button_component';

describe('tbdev upload test', () => {
  const clipboardSpy = jasmine.createSpyObj('Clipboard', ['copy']);
  let fakeWindow: any = {};
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
        {provide: Clipboard, useValue: clipboardSpy},
        {provide: 'window', useValue: fakeWindow},
      ],
    }).compileComponents();
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

    expect(fixture.debugElement.classes.shown).toBeUndefined();
    expect(fixture.debugElement.children.length).toEqual(0);
  });

  it('shows upload button if hostname is localhost', async () => {
    fakeWindow.location.hostname = 'localhost';
    const fixture = TestBed.createComponent(TbdevUploadButtonComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.classes.shown).toBeDefined();
    expect(fixture.debugElement.children.length).toEqual(1);
  });

  it('shows upload button if hostname is 127.0.0.1', async () => {
    fakeWindow.location.hostname = '127.0.0.1';
    const fixture = TestBed.createComponent(TbdevUploadButtonComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.classes.shown).toBeDefined();
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

  it('allows command to be copied', async () => {
    const fixture = TestBed.createComponent(TbdevUploadDialogComponent);
    fixture.detectChanges();

    const copyElement = fixture.debugElement.query(By.css('.command-copy'));
    copyElement.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(clipboardSpy.copy).toHaveBeenCalledWith(
      'tensorboard dev upload --logdir {logdir}'
    );
  });
});
