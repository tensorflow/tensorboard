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
import {Directive, ElementRef} from '@angular/core';
import {Store} from '@ngrx/store';

import {State} from '../../../app_state';
import {FEATURE_FLAGS_QUERY_STRING_NAME} from '../../../feature_flag/http/const';
import {getFeatureFlagsToSendToServer} from '../../../feature_flag/store/feature_flag_selectors';

@Directive({selector: 'img'})
export class ImageCardDirective {
  constructor(private readonly store: Store<State>, private el: ElementRef) {}

  ngOnInit() {
    let src = this.el.nativeElement.src;
    this.store
      .select(getFeatureFlagsToSendToServer)
      .subscribe((featureFlags) => {
        if (Object.keys(featureFlags).length > 0) {
          const params = new URLSearchParams([
            [FEATURE_FLAGS_QUERY_STRING_NAME, JSON.stringify(featureFlags)],
          ]);
          const delimiter = src.includes('?') ? '&' : '?';
          src += delimiter + String(params);
          this.el.nativeElement.src = src;
        }
      });
  }
}
