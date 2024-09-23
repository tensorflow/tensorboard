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
import {MatDialogRef} from '@angular/material/dialog';
import {GroupByKey, Run} from '../../types';
import {MatSelectChange} from '@angular/material/select';
import {memoize} from '../../../util/memoize';

export interface ColorGroup {
  groupId: string;
  color: string;
  runs: Run[];
}

@Component({
  standalone: false,
  selector: 'regex-edit-dialog-component',
  templateUrl: 'regex_edit_dialog.ng.html',
  styleUrls: ['regex_edit_dialog_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegexEditDialogComponent {
  @Input() regexString!: string;
  @Input() colorRunPairList!: ColorGroup[];
  @Input() selectedGroupBy!: GroupByKey;
  @Input() enableColorByExperiment!: boolean;

  @Output() onSave = new EventEmitter();
  @Output() regexInputOnChange = new EventEmitter<string>();
  @Output() regexTypeOnChange = new EventEmitter<GroupByKey>();

  // Constants
  REGEX_BY_RUN_STR = 'regex_by_run';
  REGEX_BY_EXP_STR = 'regex_by_exp';

  timeOutId = 0;
  @ViewChild('regexStringInput', {static: true})
  regexStringInput!: ElementRef<HTMLInputElement>;

  constructor(
    public readonly dialogRef: MatDialogRef<RegexEditDialogComponent>,
    private readonly hostElRef: ElementRef
  ) {}

  regexTypeFn = memoize(this.internalRegexTypeFn.bind(this));
  private internalRegexTypeFn(key: GroupByKey) {
    return key === GroupByKey.REGEX_BY_EXP
      ? this.REGEX_BY_EXP_STR
      : this.REGEX_BY_RUN_STR;
  }

  private resetFocus() {
    if (!this.hostElRef.nativeElement.contains(document.activeElement)) {
      const input = this.regexStringInput.nativeElement;
      input.focus();
    }
  }

  onEnter() {
    this.onSaveClick();
    this.dialogRef.close();
  }

  onSaveClick() {
    this.onSave.emit();
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

  regexTypeChange(event: MatSelectChange) {
    this.regexTypeOnChange.emit(
      event.value === this.REGEX_BY_RUN_STR
        ? GroupByKey.REGEX
        : GroupByKey.REGEX_BY_EXP
    );
  }
}
