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
  ChangeDetectorRef,
  Directive,
  ElementRef,
  HostBinding,
  Input,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {firstValueFrom} from 'rxjs';
import {map, tap} from 'rxjs/operators';

import {FEATURE_FLAGS_QUERY_STRING_NAME} from '../http/const';
import {getFeatureFlagsToSendToServer} from '../store/feature_flag_selectors';
import {State as FeatureFlagState} from '../store/feature_flag_types';

@Directive({
  standalone: false,
  selector: 'a[includeFeatureFlags], img[includeFeatureFlags]',
})
export class FeatureFlagDirective {
  @HostBinding('attr.href') hrefAttr: string | undefined = undefined;
  @HostBinding('attr.src') srcAttr: string | undefined = undefined;
  // The selector applies if [includeFeatureFlags] is present at all. Supplying
  // [includeFeatureFlags]="true"/"false" has no impact on the actual logic and
  // will behave the same as though [includeFeatureFlags] is unset.
  @Input() includeFeatureFlags: boolean = true;

  constructor(
    private readonly store: Store<FeatureFlagState>,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  private getUrlWithFeatureFlags(url: string) {
    return this.store.select(getFeatureFlagsToSendToServer).pipe(
      map((featureFlags) => {
        if (Object.keys(featureFlags).length > 0) {
          const params = new URLSearchParams([
            [FEATURE_FLAGS_QUERY_STRING_NAME, JSON.stringify(featureFlags)],
          ]);
          const delimiter = url.includes('?') ? '&' : '?';
          return url + delimiter + String(params);
        } else {
          return url;
        }
      })
    );
  }

  @Input()
  set href(href: string | null) {
    if (href) {
      firstValueFrom(this.getUrlWithFeatureFlags(href)).then((value) => {
        this.hrefAttr = value;
        this.changeDetectorRef.detectChanges();
      });
    }
  }

  @Input()
  set src(src: string | null) {
    if (src) {
      firstValueFrom(this.getUrlWithFeatureFlags(src)).then((value) => {
        this.srcAttr = value;
        this.changeDetectorRef.detectChanges();
      });
    }
  }
}
