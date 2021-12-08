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
/**
 * Unit tests for the the Alerts component and container.
 */
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {alertTypeFocusToggled} from '../../actions';
import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {AlertType, State} from '../../store/debugger_types';
import {
  createAlertsState,
  createDebuggerState,
  createState,
} from '../../testing';
import {ExecutionDataModule} from '../execution_data/execution_data_module';
import {GraphExecutionsModule} from '../graph_executions/graph_executions_module';
import {InactiveModule} from '../inactive/inactive_module';
import {SourceFilesModule} from '../source_files/source_files_module';
import {StackTraceModule} from '../stack_trace/stack_trace_module';
import {TimelineModule} from '../timeline/timeline_module';
import {AlertsContainer} from './alerts_container';
import {AlertsModule} from './alerts_module';

describe('Alerts Container', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      imports: [
        AlertsModule,
        CommonModule,
        ExecutionDataModule,
        GraphExecutionsModule,
        InactiveModule,
        SourceFilesModule,
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
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch');
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

  it('renders alert type focus correctly: one focus type', () => {
    const fixture = TestBed.createComponent(AlertsContainer);
    store.setState(
      createState(
        createDebuggerState({
          activeRunId: '__default_debugger_runs__',
          alerts: createAlertsState({
            numAlerts: 5,
            alertsBreakdown: {
              [AlertType.INF_NAN_ALERT]: 3,
              [AlertType.TENSOR_SHAPE_ALERT]: 2,
            },
            focusType: AlertType.INF_NAN_ALERT,
          }),
        })
      )
    );
    fixture.detectChanges();

    const alertBreakdownsInFocus = fixture.debugElement.queryAll(
      By.css('.alerts-breakdown-type.focus')
    );
    expect(alertBreakdownsInFocus.length).toBe(1);
    const typeNameElement = alertBreakdownsInFocus[0].query(
      By.css('.alert-type-name')
    );
    expect(typeNameElement.nativeElement.innerText).toBe('NaN/∞');
  });

  it('renders alert type focus correctly: no focus', () => {
    const fixture = TestBed.createComponent(AlertsContainer);
    store.setState(
      createState(
        createDebuggerState({
          activeRunId: '__default_debugger_runs__',
          alerts: createAlertsState({
            numAlerts: 5,
            alertsBreakdown: {
              [AlertType.INF_NAN_ALERT]: 3,
              [AlertType.TENSOR_SHAPE_ALERT]: 2,
            },
            focusType: null,
          }),
        })
      )
    );
    fixture.detectChanges();

    const alertBreakdownsInFocus = fixture.debugElement.queryAll(
      By.css('.alerts-breakdown-type.focus')
    );
    expect(alertBreakdownsInFocus.length).toBe(0);
  });

  it('dispatches alertTypeFocusToggled when breakdown is clicked', () => {
    const fixture = TestBed.createComponent(AlertsContainer);
    store.setState(
      createState(
        createDebuggerState({
          activeRunId: '__default_debugger_runs__',
          alerts: createAlertsState({
            numAlerts: 5,
            alertsBreakdown: {
              [AlertType.INF_NAN_ALERT]: 3,
              [AlertType.TENSOR_SHAPE_ALERT]: 2,
            },
            focusType: null,
          }),
        })
      )
    );
    fixture.detectChanges();

    const alertBreakdownTypes = fixture.debugElement.queryAll(
      By.css('.alerts-breakdown-type')
    );
    expect(alertBreakdownTypes.length).toBe(2);
    alertBreakdownTypes[0].nativeElement.click();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      alertTypeFocusToggled({alertType: AlertType.INF_NAN_ALERT})
    );
    alertBreakdownTypes[1].nativeElement.click();
    expect(dispatchSpy).toHaveBeenCalledTimes(2);
    expect(dispatchSpy).toHaveBeenCalledWith(
      alertTypeFocusToggled({alertType: AlertType.TENSOR_SHAPE_ALERT})
    );
  });
});
