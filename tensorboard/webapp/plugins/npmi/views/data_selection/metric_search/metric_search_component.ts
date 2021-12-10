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
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';

@Component({
  selector: 'metric-search-component',
  templateUrl: './metric_search_component.ng.html',
  styleUrls: ['./metric_search_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricSearchComponent {
  @Input() completions!: string[];
  @Input() regexFilterValue!: string;
  @HostBinding('class.valid') @Input() isRegexFilterValid!: boolean;
  @Output() onRegexFilterValueChange = new EventEmitter<string>();
  @Output() onAddFilter = new EventEmitter<string>();

  onOptionSelected(
    event: MatAutocompleteSelectedEvent,
    matInput: HTMLInputElement
  ) {
    this.onAddFilter.emit(event.option.value);
    // matInput.value needs to be cleared manually, since the Angular Material Component may be modifying the input value outside of change detection
    matInput.value = '';
  }
}
