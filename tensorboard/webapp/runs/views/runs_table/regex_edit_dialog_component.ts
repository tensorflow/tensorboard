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
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {MatLegacyDialogRef} from '@angular/material/legacy-dialog';
import {Run} from '../../types';

export interface ColorGroup {
  groupId: string;
  color: string;
  runs: Run[];
}

@Component({
  selector: 'regex-edit-dialog-component',
  templateUrl: 'regex_edit_dialog.ng.html',
  styleUrls: ['regex_edit_dialog_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegexEditDialogComponent {
  @Input() regexString!: string;
  @Input() colorRunPairList!: ColorGroup[];

  @Output() onSave = new EventEmitter<string>();
  @Output() regexInputOnChange = new EventEmitter<string>();

  timeOutId = 0;
  @ViewChild('regexStringInput', {static: true})
  regexStringInput!: ElementRef<HTMLInputElement>;

  constructor(
    public readonly dialogRef: MatLegacyDialogRef<RegexEditDialogComponent>,
    private readonly hostElRef: ElementRef
  ) {}

  private resetFocus() {
    if (!this.hostElRef.nativeElement.contains(document.activeElement)) {
      const input = this.regexStringInput.nativeElement;
      input.focus();
    }
  }

  onEnter(regexString: string) {
    this.onSaveClick(regexString);
    this.dialogRef.close();
  }

  onSaveClick(regexString: string) {
    this.onSave.emit(regexString);
  }

  fillExample(regexExample: string): void {
    this.regexString = regexExample;
    this.regexInputChange(regexExample);
  }

  regexInputChange(regexString: string) {
    this.regexInputOnChange.emit(regexString);
  }

  handleFocusOut() {
    clearTimeout(this.timeOutId);
    this.timeOutId = setTimeout(this.resetFocus.bind(this), 0);
  }
}
