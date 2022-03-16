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
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {LinkedTime} from '../../types';

export type LinkedTimeWithClipped = LinkedTime & {clipped: boolean};

@Component({
  // TODO(japie1235813): Renames to `vis-selected-time-warning` on module applied to cards.
  selector: 'vis-selected-time-clipped',
  template: `
    <mat-icon
      *ngIf="isClipped"
      svgIcon="info_outline_24px"
      title="Linked step is not found in this visualization. We highlighted the closest step for you."
    ></mat-icon>
    <mat-icon
      *ngIf="isClosestStepHighlighted"
      svgIcon="info_outline_24px"
      title="Data is not found on selected step(s). We highlighted the closest step for you."
    ></mat-icon>
  `,
  styleUrls: ['vis_selected_time_warning_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisSelectedTimeWarningComponent {
  // TODO(japie1235813): Switch default to false on module applied to cards.
  @Input() isClipped?: boolean = true;
  @Input() isClosestStepHighlighted?: boolean = false;
}
