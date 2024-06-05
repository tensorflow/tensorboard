/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {MatDialogRef} from '@angular/material/dialog';

import {SavingPinsDialogModule} from './saving_pins_dialog_module';
import {SavingPinsDialogComponent} from './saving_pins_dialog_component';

describe('saving pins dialog', () => {
  let mockMatDialogRef: {close: jasmine.Spy};

  beforeEach(async () => {
    mockMatDialogRef = {close: jasmine.createSpy()};
    await TestBed.configureTestingModule({
      declarations: [SavingPinsDialogComponent],
      imports: [CommonModule, SavingPinsDialogModule],
      providers: [{provide: MatDialogRef, useValue: mockMatDialogRef}],
    }).compileComponents();
  });

  it('clicks disable button', () => {
    const fixture = TestBed.createComponent(SavingPinsDialogComponent);
    fixture.detectChanges();

    const confirmEl = fixture.debugElement.query(By.css('.disable-button'));
    confirmEl.nativeElement.click();

    expect(mockMatDialogRef.close).toHaveBeenCalledWith({shouldDisable: true});
  });

  it('clicks cancel button', () => {
    const fixture = TestBed.createComponent(SavingPinsDialogComponent);
    fixture.detectChanges();

    const cancelEl = fixture.debugElement.query(By.css('.cancel-button'));
    cancelEl.nativeElement.click();

    expect(mockMatDialogRef.close).toHaveBeenCalledWith({shouldDisable: false});
  });
});
