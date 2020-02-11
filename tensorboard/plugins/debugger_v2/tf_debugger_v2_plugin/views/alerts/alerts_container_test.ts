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
/**
 * Unit tests for the the Alerts component and container.
 */
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {State} from '../../store/debugger_types';
import {
  createDebuggerState,
  createState,
  createAlertsState,
} from '../../testing';
import {AlertsContainer} from './alerts_container';
import {AlertsModule} from './alerts_module';
import {ExecutionDataModule} from '../execution_data/execution_data_module';
import {InactiveModule} from '../inactive/inactive_module';
import {StackTraceModule} from '../stack_trace/stack_trace_module';
import {TimelineModule} from '../timeline/timeline_module';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Alerts Container', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      imports: [
        AlertsModule,
        CommonModule,
        ExecutionDataModule,
        InactiveModule,
        StackTraceModule,
        TimelineModule,
      ],
      providers: [
        provideMockStore({
          initialState: createState(createDebuggerState()),
        }),
        DebuggerContainer,
      ],
    }).compileComponents();
    store = TestBed.get(Store);
  });

  it('renders number of alerts and breakdown: no alerts', () => {
    const fixture = TestBed.createComponent(AlertsContainer);
    store.setState(
      createState(
        createDebuggerState({
          activeRunId: '__default_debugger_runs__',
          alerts: createAlertsState(),
        })
      )
    );
    fixture.detectChanges();

    const numAlertsValueElement = fixture.debugElement.query(
      By.css('.num-alerts-value')
    );
    expect(numAlertsValueElement.nativeElement.innerText).toBe('0');
    const alertTypeNameElements = fixture.debugElement.queryAll(
      By.css('.alert-type-name')
    );
    expect(alertTypeNameElements.length).toBe(0);
  });

  it('renders number of alerts and breakdown: one alert type', () => {
    const fixture = TestBed.createComponent(AlertsContainer);
    store.setState(
      createState(
        createDebuggerState({
          activeRunId: '__default_debugger_runs__',
          alerts: createAlertsState({
            numAlerts: 10,
            alertsBreakdown: {
              InfNanAlert: 10,
            },
          }),
        })
      )
    );
    fixture.detectChanges();

    const numAlertsValueElement = fixture.debugElement.query(
      By.css('.num-alerts-value')
    );
    expect(numAlertsValueElement.nativeElement.innerText).toBe('10');
    const alertTypeNameElements = fixture.debugElement.queryAll(
      By.css('.alert-type-name')
    );
    const alertTypeCountElements = fixture.debugElement.queryAll(
      By.css('.alert-type-count')
    );
    expect(alertTypeNameElements.length).toBe(1);
    expect(alertTypeNameElements[0].nativeElement.innerText).toBe('NaN/∞');
    expect(alertTypeCountElements.length).toBe(1);
    expect(alertTypeCountElements[0].nativeElement.innerText).toBe('∞: 10');
  });

  it('renders number of alerts and breakdown: three alert types', () => {
    const fixture = TestBed.createComponent(AlertsContainer);
    store.setState(
      createState(
        createDebuggerState({
          activeRunId: '__default_debugger_runs__',
          alerts: createAlertsState({
            numAlerts: 11,
            alertsBreakdown: {
              FunctionRecompilesAlert: 5,
              InfNanAlert: 4,
              TensorShapeAlert: 2,
            },
          }),
        })
      )
    );
    fixture.detectChanges();

    const numAlertsValueElement = fixture.debugElement.query(
      By.css('.num-alerts-value')
    );
    expect(numAlertsValueElement.nativeElement.innerText).toBe('11');
    const alertTypeNameElements = fixture.debugElement.queryAll(
      By.css('.alert-type-name')
    );
    const alertTypeCountElements = fixture.debugElement.queryAll(
      By.css('.alert-type-count')
    );
    expect(alertTypeNameElements.length).toBe(3);
    expect(alertTypeNameElements[0].nativeElement.innerText).toBe(
      'Function recompiles'
    );
    expect(alertTypeNameElements[1].nativeElement.innerText).toBe('NaN/∞');
    expect(alertTypeNameElements[2].nativeElement.innerText).toBe(
      'Tensor shape'
    );
    expect(alertTypeCountElements.length).toBe(3);
    expect(alertTypeCountElements[0].nativeElement.innerText).toBe('C: 5');
    expect(alertTypeCountElements[1].nativeElement.innerText).toBe('∞: 4');
    expect(alertTypeCountElements[2].nativeElement.innerText).toBe('■: 2');
  });
});
