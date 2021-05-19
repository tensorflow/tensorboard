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

import {GroupBy, GroupByKey} from '../../types';

@Component({
  selector: 'runs-group-menu-button-component',
  template: `
    <button
      mat-icon-button
      title="Group runs by..."
      [matMenuTriggerFor]="groupByMenu"
    >
      <mat-icon svgIcon="palette_24px"></mat-icon>
    </button>
    <mat-menu #groupByMenu="matMenu" class="run-table-color-group-by">
      <div class="label">Color runs by</div>
      <button
        mat-menu-item
        role="menuitemradio"
        [attr.aria-checked]="selectedGroupBy.key === GroupByKey.EXPERIMENT"
        (click)="onGroupByChange.emit({key: GroupByKey.EXPERIMENT})"
      >
        <span>
          <mat-icon
            *ngIf="selectedGroupBy.key === GroupByKey.EXPERIMENT"
            svgIcon="done_24px"
          ></mat-icon>
        </span>
        <label>Experiment</label>
      </button>
      <button
        mat-menu-item
        role="menuitemradio"
        [attr.aria-checked]="selectedGroupBy.key === GroupByKey.RUN"
        (click)="onGroupByChange.emit({key: GroupByKey.RUN})"
      >
        <span>
          <mat-icon
            *ngIf="selectedGroupBy.key === GroupByKey.RUN"
            svgIcon="done_24px"
          ></mat-icon>
        </span>
        <label>Run</label>
      </button>
      <button
        mat-menu-item
        role="menuitemradio"
        [attr.aria-checked]="selectedGroupBy.key === GroupByKey.REGEX"
        (click)="onGroupByChange.emit({key: GroupByKey.REGEX, regexString: ''})"
      >
        <span>
          <mat-icon
            *ngIf="selectedGroupBy.key === GroupByKey.REGEX"
            svgIcon="done_24px"
          ></mat-icon>
        </span>
        <label>Regex</label>
      </button>
    </mat-menu>
  `,
  styleUrls: ['runs_group_menu_button_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunsGroupMenuButtonComponent {
  readonly GroupByKey = GroupByKey;

  @Input()
  selectedGroupBy!: GroupBy;

  @Output()
  onGroupByChange = new EventEmitter<GroupBy>();
}
