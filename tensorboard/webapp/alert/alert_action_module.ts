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
  Inject,
  InjectionToken,
  ModuleWithProviders,
  NgModule,
  Optional,
} from '@angular/core';
import {Action, ActionCreator, Creator} from '@ngrx/store';
import {AlertReport} from './types';

// While this token is not used outside, it must be exported so that stricter
// build tools may discover it during compilation.
export const ACTION_TO_ALERT_PROVIDER = new InjectionToken<
  ActionToAlertConfig[]
>('[Alert] Action-To-Alert Provider');

export type ActionToAlertTransformer = (action: Action) => AlertReport | null;

export interface ActionToAlertConfig {
  /**
   * The action to listen for.
   */
  actionCreator: ActionCreator<string, Creator>;

  /**
   * A function that returns an alert report, or null, when the action is
   * received.
   */
  alertFromAction: ActionToAlertTransformer;
}

/**
 * An NgModule that provides alert-producing actions. These action configs are
 * collected by AlertModule, which tracks application alerts.
 *
 * When the configured action fires, the AlertModule may respond.
 *
 * @NgModule({
 *   imports: [
 *     AlertActionModule.registerAlertActions([
 *       {
 *         action: fetchKeysFailed,
 *         alertFromAction: () => {localizedMessage: "Keys failed to fetch."},
 *       },
 *       {
 *         action: greenButtonClicked,
 *         alertFromAction: (actionPayload) => {
 *           if (!actionPayload.wasButtonEnabled) {
 *             return {localizedMessage: "Green button failed."};
 *           }
 *           return null;
 *         }
 *       }
 *     ]),
 *   ],
 * })
 */
@NgModule({})
export class AlertActionModule {
  /**
   * Map from action creator type to transformer function.
   */
  private readonly providers = new Map<string, ActionToAlertTransformer>();

  constructor(
    @Optional()
    @Inject(ACTION_TO_ALERT_PROVIDER)
    providers: ActionToAlertConfig[][]
  ) {
    for (const configs of providers || []) {
      for (const config of configs) {
        if (this.providers.has(config.actionCreator.type)) {
          throw new RangeError(
            `"${config.actionCreator.type}" is already registered for alerts.` +
              ' Multiple alerts for the same action is not allowed.'
          );
        }
        this.providers.set(config.actionCreator.type, config.alertFromAction);
      }
    }
  }

  getAlertFromAction(action: Action): AlertReport | null {
    const lambda = this.providers.get(action.type);
    if (!lambda) {
      return null;
    }
    return lambda(action);
  }

  static registerAlertActions(
    providerFactory: () => ActionToAlertConfig[]
  ): ModuleWithProviders<AlertActionModule> {
    return {
      ngModule: AlertActionModule,
      providers: [
        {
          provide: ACTION_TO_ALERT_PROVIDER,
          multi: true,
          useFactory: providerFactory,
        },
      ],
    };
  }
}
