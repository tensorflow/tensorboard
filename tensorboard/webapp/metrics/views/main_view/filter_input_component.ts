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
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import {escapeForRegex} from '../../../util/string';

@Component({
  standalone: false,
  selector: 'metrics-tag-filter-component',
  templateUrl: 'filter_input_component.ng.html',
  styleUrls: [`filter_input_component.css`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsFilterInputComponent {
  @Input() regexFilterValue!: string;
  @HostBinding('class.valid') @Input() isRegexFilterValid!: boolean;
  @Input() completions!: string[];
  @Output() onRegexFilterValueChange = new EventEmitter<string>();

  onCompletionAccepted(completion: string) {
    this.onRegexFilterValueChange.emit(escapeForRegex(completion));
  }
}
