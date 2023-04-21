/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
  ElementRef,
  HostBinding,
  HostListener,
  Input,
} from '@angular/core';
import {Store} from '@ngrx/store';

import {State} from '../../../app_state';
import {FEATURE_FLAGS_QUERY_STRING_NAME} from '../../../feature_flag/http/const';
import {getFeatureFlagsToSendToServer} from '../../../feature_flag/store/feature_flag_selectors';

//@Directive({selector: '.download-controls'})
@Directive({selector: 'a[downloadHref]'})
export class DataDownloadDialogDirective {
  private fullHref: string | null = null;

  constructor(
    private readonly store: Store<State>,
    private readonly el: ElementRef
  ) {}

  @HostBinding('attr.href')
  get href() {
    return this.fullHref;
  }

  /*  Add featureFlags to a download URL. */
  @Input()
  set downloadHref(baseHref: string | null) {
    if (baseHref) {
      this.store
        .select(getFeatureFlagsToSendToServer)
        .subscribe((featureFlags) => {
          let trailingParams = '';
          if (Object.keys(featureFlags).length > 0) {
            const params = new URLSearchParams([
              [FEATURE_FLAGS_QUERY_STRING_NAME, JSON.stringify(featureFlags)],
            ]);
            const delimiter = baseHref.includes('?') ? '&' : '?';
            trailingParams = delimiter + String(params);
          }
          this.fullHref = baseHref + trailingParams;
        });
    }
  }
}
