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
import {Component, Input} from '@angular/core';
import {FeatureFlagState} from '../store/feature_flag_types';
@Component({
  selector: 'feature-flag-page-component',
  templateUrl: `feature_flag_page.ng.html`,
})
export class FeatureFlagPageComponent {
  @Input() featureFlags!: FeatureFlagState;

  getFlagKeys(): string[] {
    return Object.keys(this.featureFlags);
  }

  flagChanged(flag: string) {
    // TODO: dispatch action which stores new flag states and updates state.
  }
}
