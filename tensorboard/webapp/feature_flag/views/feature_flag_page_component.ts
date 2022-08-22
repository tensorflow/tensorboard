/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import {FeatureFlagType} from '../store/feature_flag_metadata';
import {FeatureFlags} from '../types';
import {
  FeatureFlagOverrideStatus,
  FeatureFlagStatus,
  FeatureFlagStatusEvent,
} from './types';

@Component({
  selector: 'feature-flag-page-component',
  styleUrls: ['feature_flag_page_style.css'],
  templateUrl: `feature_flag_page.ng.html`,
})
export class FeatureFlagPageComponent {
  @Input() featureFlagStatuses!: FeatureFlagStatus<keyof FeatureFlags>[];

  @Output() flagChanged = new EventEmitter<FeatureFlagStatusEvent>();

  @Output() allFlagsReset = new EventEmitter();

  setFlag(flag: keyof FeatureFlags, status: FeatureFlagOverrideStatus) {
    this.flagChanged.emit({flag, status});
  }

  private getFormattedFlagValue(value: FeatureFlagType): string {
    if (value === true) {
      return 'Enabled';
    }

    if (value === false) {
      return 'Disabled';
    }

    if (value === null || value === undefined) {
      return 'null';
    }

    return value.toString();
  }

  formatFlagValue(value: FeatureFlagType): string {
    const formattedValue = this.getFormattedFlagValue(value);
    if (formattedValue.length === 0) {
      return '';
    }
    return `- ${formattedValue}`;
  }
}
