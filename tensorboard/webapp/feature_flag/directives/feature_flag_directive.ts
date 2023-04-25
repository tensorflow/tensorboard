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
import {
  Directive,
  HostBinding,
  Input,
  NgModule,
  OnChanges,
} from '@angular/core';
import {Store} from '@ngrx/store';

import {FEATURE_FLAGS_QUERY_STRING_NAME} from '../http/const';
import {getFeatureFlagsToSendToServer} from '../store/feature_flag_selectors';
import {State as FeatureFlagState} from '../store/feature_flag_types';

@Directive({selector: 'a'})
export class FeatureFlagHrefDirective implements OnChanges {
  @HostBinding('attr.href') hrefAttr = '';
  @Input() href: string | null = null;

  constructor(private readonly store: Store<FeatureFlagState>) {}

  ngOnChanges() {
    if (this.href) {
      this.store
        .select(getFeatureFlagsToSendToServer)
        .subscribe((featureFlags) => {
          let updatedUrl = this.href!;
          if (Object.keys(featureFlags).length > 0) {
            const params = new URLSearchParams([
              [FEATURE_FLAGS_QUERY_STRING_NAME, JSON.stringify(featureFlags)],
            ]);
            const delimiter = this.href!.includes('?') ? '&' : '?';
            updatedUrl = this.href! + delimiter + String(params);
          }
          this.hrefAttr = updatedUrl;
        });
    }
  }
}

@Directive({selector: 'img'})
export class FeatureFlagImgDirective implements OnChanges {
  @HostBinding('attr.src') srcAttr = '';
  @Input() src: string | null = null;

  constructor(private readonly store: Store<FeatureFlagState>) {}

  ngOnChanges() {
    if (this.src) {
      this.store
        .select(getFeatureFlagsToSendToServer)
        .subscribe((featureFlags) => {
          let updatedUrl = this.src!;
          if (Object.keys(featureFlags).length > 0) {
            const params = new URLSearchParams([
              [FEATURE_FLAGS_QUERY_STRING_NAME, JSON.stringify(featureFlags)],
            ]);
            const delimiter = this.src!.includes('?') ? '&' : '?';
            updatedUrl = this.src! + delimiter + String(params);
          }
          this.srcAttr = updatedUrl;
        });
    }
  }
}

@NgModule({
  declarations: [FeatureFlagHrefDirective, FeatureFlagImgDirective],
  exports: [FeatureFlagHrefDirective, FeatureFlagImgDirective],
})
export class FeatureFlagDirectiveModule {}
