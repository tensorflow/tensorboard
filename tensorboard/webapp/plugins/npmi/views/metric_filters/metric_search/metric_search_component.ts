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
  Input,
  Output,
  EventEmitter,
  HostBinding,
  ViewChild,
} from '@angular/core';
import {MatAutocompleteTrigger} from '@angular/material/autocomplete';

import {Store} from '@ngrx/store';

import * as npmiActions from '../../../actions';

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
  @ViewChild(MatAutocompleteTrigger, {static: true})
  autocompleteTrigger!: MatAutocompleteTrigger;

  constructor(private store: Store<any>) {}

  onFilterKeyUp(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (this.completions.length !== 0) {
        // If the filter has options, take the first one
        this.store.dispatch(
          npmiActions.addMetricFilter({metric: this.completions[0]})
        );
        this.store.dispatch(npmiActions.metricsRegexChanged({regex: ''}));
        this.store.dispatch(
          npmiActions.addMetricFilter({metric: this.completions[0]})
        );
      } else if (this.completions.indexOf(this.regexFilterValue) !== -1) {
        // Else, look for a direct string match
        this.store.dispatch(
          npmiActions.addMetricFilter({metric: this.regexFilterValue})
        );
        this.store.dispatch(npmiActions.metricsRegexChanged({regex: ''}));
        this.store.dispatch(
          npmiActions.addMetricFilter({metric: this.regexFilterValue})
        );
      }
    }
  }

  optionClick(metric: string) {
    this.store.dispatch(npmiActions.addMetricFilter({metric: metric}));
    this.store.dispatch(npmiActions.metricsRegexChanged({regex: ''}));
  }
}
