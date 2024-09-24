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
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {AlertType} from '../../store/debugger_types';

export interface AlertTypeDisplay {
  displayName: string;
  displaySymbol: string;
  count: number;
  type: AlertType;
}

@Component({
  standalone: false,
  selector: 'alerts-component',
  templateUrl: './alerts_component.ng.html',
  styleUrls: ['./alerts_component.css'],
})
export class AlertsComponent {
  // Total number of alerts.
  @Input()
  numAlerts: number = 0;

  @Input()
  alertsBreakdown: AlertTypeDisplay[] = [];

  @Input()
  focusType: AlertType | null = null;

  @Output()
  onToggleFocusType = new EventEmitter<AlertType>();
}
