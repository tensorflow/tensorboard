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
import {TimeSelection} from '../../types';

export type TimeSelectionWithClipped = TimeSelection & {clipped: boolean};

@Component({
  standalone: false,
  selector: 'vis-linked-time-selection-warning',
  template: `
    <mat-icon
      *ngIf="isClipped"
      data-value="clipped"
      svgIcon="info_outline_24px"
      title="Linked step is not found in this visualization. We highlighted the closest step for you."
    ></mat-icon>
    <mat-icon
      *ngIf="isClosestStepHighlighted"
      data-value="closestStepHighlighted"
      svgIcon="info_outline_24px"
      title="Data is not found on selected step. We highlighted the closest step for you."
    ></mat-icon>
  `,
  styleUrls: ['vis_linked_time_selection_warning_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisLinkedTimeSelectionWarningComponent {
  @Input() isClipped?: boolean = false;
  @Input() isClosestStepHighlighted?: boolean = false;
}
