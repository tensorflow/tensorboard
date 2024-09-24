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
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {GroupBy, GroupByKey} from '../../types';
import {RegexEditDialogContainer} from './regex_edit_dialog_container';

@Component({
  standalone: false,
  selector: 'runs-group-menu-button-component',
  templateUrl: 'runs_group_menu_button_component.ng.html',
  styleUrls: ['runs_group_menu_button_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunsGroupMenuButtonComponent {
  readonly GroupByKey = GroupByKey;

  @Input() showExperimentsGroupBy!: boolean;
  @Input() experimentIds!: string[];
  @Input() regexString!: string;
  @Input() selectedGroupBy!: GroupBy;
  @Input() lastRegexGroupByKey!: GroupByKey;

  @Output()
  onGroupByChange = new EventEmitter<GroupBy>();

  constructor(private readonly dialog: MatDialog) {}

  onRegexStringEdit() {
    this.dialog.open(RegexEditDialogContainer, {
      maxHeight: '95vh',
      maxWidth: '80vw',
      data: {
        experimentIds: this.experimentIds,
      },
    });
  }

  onGroupByRegexClick() {
    if (!this.regexString) {
      this.onRegexStringEdit();
    } else {
      this.onGroupByChange.emit({
        key: this.lastRegexGroupByKey,
        regexString: this.regexString,
      });
    }
  }
}
