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
import {Component} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map, withLatestFrom} from 'rxjs/operators';
import {State} from '../../app_state';
import {
  allFeatureFlagOverridesReset,
  featureFlagOverrideChanged,
  featureFlagOverridesReset,
} from '../actions/feature_flag_actions';
import {
  getDefaultFeatureFlags,
  getOverriddenFeatureFlags,
} from '../store/feature_flag_selectors';
import {FeatureFlags} from '../types';
import {
  FeatureFlagOverrideStatus,
  FeatureFlagStatus,
  FeatureFlagStatusEvent,
} from './types';

@Component({
  selector: 'feature-flag-page',
  template: `<feature-flag-page-component
    [featureFlagStatuses]="featureFlags$ | async"
    (flagChanged)="onFlagChanged($event)"
    (allFlagsReset)="onAllFlagsReset()"
  ></feature-flag-page-component>`,
})
export class FeatureFlagPageContainer {
  constructor(private readonly store: Store<State>) {}

  readonly featureFlags$: Observable<FeatureFlagStatus<keyof FeatureFlags>[]> =
    this.store.select(getDefaultFeatureFlags).pipe(
      withLatestFrom(this.store.select(getOverriddenFeatureFlags)),
      map(([defaultFeatureFlags, overriddenFeatureFlags]) => {
        return Object.entries(defaultFeatureFlags).map(
          ([flagName, defaultValue]) => {
            const status = this.getFlagStatus(
              flagName as keyof FeatureFlags,
              overriddenFeatureFlags
            );
            return {
              flag: flagName,
              defaultValue,
              status,
            } as FeatureFlagStatus<keyof FeatureFlags>;
          }
        );
      })
    );

  onFlagChanged({flag, status}: FeatureFlagStatusEvent) {
    switch (status) {
      case FeatureFlagOverrideStatus.DEFAULT:
        this.store.dispatch(featureFlagOverridesReset({flags: [flag]}));
        break;
      case FeatureFlagOverrideStatus.ENABLED:
        this.store.dispatch(
          featureFlagOverrideChanged({flags: {[flag]: true}})
        );
        break;
      case FeatureFlagOverrideStatus.DISABLED:
        this.store.dispatch(
          featureFlagOverrideChanged({flags: {[flag]: false}})
        );
        break;
      default:
        throw new Error('Flag changed to invalid status');
    }
  }

  onAllFlagsReset() {
    this.store.dispatch(allFeatureFlagOverridesReset());
  }

  private getFlagStatus(
    flagName: keyof FeatureFlags,
    overriddenFeatureFlags: Partial<FeatureFlags>
  ): FeatureFlagOverrideStatus {
    if (overriddenFeatureFlags[flagName] === undefined) {
      return FeatureFlagOverrideStatus.DEFAULT;
    }
    return overriddenFeatureFlags[flagName]
      ? FeatureFlagOverrideStatus.ENABLED
      : FeatureFlagOverrideStatus.DISABLED;
  }
}
