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
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ExperimentAlias} from '../../experiments/types';

/**
 * The component used to display experiment alias and help users distinguish
 * this experiment from others.
 */
@Component({
  standalone: false,
  selector: 'tb-experiment-alias',
  template: `
    <span class="alias-number">{{ alias.aliasNumber }}</span>
    <content-wrapping-input
      *ngIf="aliasEditable; else noEditAliasName"
      placeholder="Alias for experiment"
      [style]="isAliasNameLegal ? 'high-contrast' : 'error'"
      [value]="alias.aliasText"
      (onValueChange)="aliasChanged.emit($event)"
    ></content-wrapping-input>
    <ng-template #noEditAliasName>
      <span [class.illegal]="!isAliasNameLegal" [title]="title">{{
        alias.aliasText
      }}</span>
    </ng-template>
  `,
  styleUrls: [`experiment_alias_component.css`],
})
export class ExperimentAliasComponent {
  @Input()
  alias!: ExperimentAlias;

  @Input()
  aliasEditable!: boolean;

  @Input()
  title?: string;

  @Input()
  isAliasNameLegal: boolean = true;

  @Output()
  aliasChanged = new EventEmitter<{value: string}>();
}
