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
  AdvancedFeatureFlagMetadata,
  FeatureFlagType,
} from '../store/feature_flag_metadata';
import {
  getDefaultFeatureFlags,
  getFeatureFlagsMetadata,
  getOverriddenFeatureFlags,
} from '../store/feature_flag_selectors';
import {FeatureFlags} from '../types';

import {
  FeatureFlagOverrideStatus,
  FeatureFlagStatus,
  FeatureFlagStatusEvent,
} from './types';

@Component({
  standalone: false,
  selector: 'feature-flag-dialog',
  template: `<feature-flag-dialog-component
    [featureFlagStatuses]="featureFlags$ | async"
    [hasFlagsSentToServer]="hasFlagsSentToServer$ | async"
    [showFlagsFilter]="showFlagsFilter$ | async"
    (flagChanged)="onFlagChanged($event)"
    (allFlagsReset)="onAllFlagsReset()"
  ></feature-flag-dialog-component>`,
})
export class FeatureFlagDialogContainer {
  constructor(private readonly store: Store<State>) {
    this.showFlagsFilter$ = this.store.select(getOverriddenFeatureFlags).pipe(
      map((overriddenFeatureFlags) => {
        return overriddenFeatureFlags.showFlags?.toLowerCase();
      })
    );
    this.hasFlagsSentToServer$ = this.store
      .select(getFeatureFlagsMetadata)
      .pipe(
        map((flagMetadata) => {
          return Object.values(flagMetadata).some((metadata) => {
            return (metadata as AdvancedFeatureFlagMetadata<FeatureFlagType>)
              .sendToServerWhenOverridden;
          });
        })
      );
    this.featureFlags$ = this.store.select(getOverriddenFeatureFlags).pipe(
      withLatestFrom(
        this.store.select(getDefaultFeatureFlags),
        this.store.select(getFeatureFlagsMetadata),
        this.showFlagsFilter$
      ),
      map(
        ([
          overriddenFeatureFlags,
          defaultFeatureFlags,
          flagMetadata,
          showFlagsFilter,
        ]) => {
          return Object.entries(defaultFeatureFlags)
            .filter(([flagName]) => {
              if (!showFlagsFilter) {
                return true;
              }
              return flagName.toLowerCase().includes(showFlagsFilter);
            })
            .map(([flagName, defaultValue]) => {
              const status = getFlagStatus(
                flagName as keyof FeatureFlags,
                overriddenFeatureFlags
              );
              const metadata = flagMetadata[flagName as keyof FeatureFlags];
              return {
                flag: flagName,
                defaultValue,
                status,
                sendToServerWhenOverridden: (
                  metadata as AdvancedFeatureFlagMetadata<FeatureFlagType>
                ).sendToServerWhenOverridden,
              } as FeatureFlagStatus<keyof FeatureFlags>;
            });
        }
      )
    );
  }

  readonly showFlagsFilter$;

  readonly hasFlagsSentToServer$: Observable<boolean>;

  readonly featureFlags$: Observable<FeatureFlagStatus<keyof FeatureFlags>[]>;

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
}

function getFlagStatus(
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

export const TEST_ONLY = {
  getFlagStatus,
};
