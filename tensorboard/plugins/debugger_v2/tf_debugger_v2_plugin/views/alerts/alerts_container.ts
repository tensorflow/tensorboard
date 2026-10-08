/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
  computed,
  inject,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {alertTypeFocusToggled} from '../../actions';
import {
  getAlertsBreakdown,
  getAlertsFocusType,
  getNumAlerts,
  State,
} from '../../store';
import {AlertType} from '../../store/debugger_types';
import {AlertTypeDisplay} from './alerts_component';

const ALERT_TYPE_TO_DISPLAY_NAME_AND_SYMBOL: {
  [alertType: string]: {
    displayName: string;
    displaySymbol: string;
  };
} = {
  [AlertType.FUNCTION_RECOMPILE_ALERT]: {
    displayName: 'Function recompiles',
    displaySymbol: 'C',
  },
  [AlertType.INF_NAN_ALERT]: {
    displayName: 'NaN/∞',
    displaySymbol: '∞',
  },
  [AlertType.TENSOR_SHAPE_ALERT]: {
    displayName: 'Tensor shape',
    displaySymbol: '■',
  },
};

@Component({
  standalone: false,
  selector: 'tf-debugger-v2-alerts',
  template: `
    <alerts-component
      [numAlerts]="numAlerts()"
      [alertsBreakdown]="alertsBreakdown()"
      [focusType]="focusType()"
      (onToggleFocusType)="onToggleFocusType($event)"
    >
    </alerts-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsContainer {
  private readonly store: Store<State> = inject(Store);

  readonly numAlerts = this.store.selectSignal(getNumAlerts);

  private readonly rawAlertsBreakdown =
    this.store.selectSignal(getAlertsBreakdown);

  readonly alertsBreakdown = computed(() => {
    const alertsBreakdown = this.rawAlertsBreakdown();
    const alertTypes = Object.keys(alertsBreakdown);
    alertTypes.sort();
    return alertTypes.map((alertType): AlertTypeDisplay => {
      return {
        type: alertType as AlertType,
        ...ALERT_TYPE_TO_DISPLAY_NAME_AND_SYMBOL[alertType],
        count: alertsBreakdown[alertType],
      };
    });
  });

  readonly focusType = this.store.selectSignal(getAlertsFocusType);

  onToggleFocusType(alertType: AlertType) {
    this.store.dispatch(alertTypeFocusToggled({alertType}));
  }
}
