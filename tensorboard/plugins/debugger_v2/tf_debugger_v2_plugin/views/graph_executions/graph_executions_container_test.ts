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
 * Unit tests for the the intra-graph execution component and container.
 */
import {CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {CommonModule} from '@angular/common';
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {graphExecutionFocused} from '../../actions';
import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {
  getFocusedGraphExecutionInputIndices,
  getGraphExecutionData,
  getGraphExecutionFocusIndex,
  getNumGraphExecutions,
} from '../../store';
import {
  GraphExecution,
  State,
  TensorDebugMode,
} from '../../store/debugger_types';
import {
  createDebuggerState,
  createState,
  createTestGraphExecution,
} from '../../testing';
import {AlertsModule} from '../alerts/alerts_module';
import {ExecutionDataModule} from '../execution_data/execution_data_module';
import {InactiveModule} from '../inactive/inactive_module';
import {SourceFilesModule} from '../source_files/source_files_module';
import {StackTraceModule} from '../stack_trace/stack_trace_module';
import {TimelineModule} from '../timeline/timeline_module';
import {GraphExecutionsContainer} from './graph_executions_container';
import {GraphExecutionsModule} from './graph_executions_module';

describe('Graph Executions Container', () => {
  let store: MockStore<State>;

  const graphExecutionData: {[index: number]: GraphExecution} = {};
  for (let i = 0; i < 120; ++i) {
    graphExecutionData[i] = createTestGraphExecution({
      op_name: `TestOp_${i}`,
      op_type: `OpType_${i}`,
      graph_id: 'g2',
      graph_ids: ['g0', 'g1', 'g2'],
      tensor_debug_mode: TensorDebugMode.CONCISE_HEALTH,
      debug_tensor_value: [i, 100, 0, 0, 0],
    });
  }

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
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('does not render execs viewport if # execs = 0', fakeAsync(() => {
    const fixture = TestBed.createComponent(GraphExecutionsContainer);
    store.overrideSelector(getNumGraphExecutions, 0);
    fixture.autoDetectChanges();
    tick();

    const titleElement = fixture.debugElement.query(
      By.css('.graph-executions-title')
    );
    expect(titleElement.nativeElement.innerText).toBe('Graph Executions (0)');
    const viewPort = fixture.debugElement.query(
      By.css('.graph-executions-viewport')
    );
    expect(viewPort).toBeNull();
  }));

  it(
    'renders # execs and execs viewport if # execs > 0; fully loaded:' +
      'highlights focus and inputs',
    fakeAsync(() => {
      const fixture = TestBed.createComponent(GraphExecutionsContainer);
      store.overrideSelector(getNumGraphExecutions, 120);
      store.overrideSelector(getGraphExecutionData, graphExecutionData);
      store.overrideSelector(getGraphExecutionFocusIndex, 99);
      store.overrideSelector(getFocusedGraphExecutionInputIndices, [1, 2]);
      fixture.autoDetectChanges();
      tick();

      const titleElement = fixture.debugElement.query(
        By.css('.graph-executions-title')
      );
      expect(titleElement.nativeElement.innerText).toBe(
        'Graph Executions (120)'
      );
      const viewPort = fixture.debugElement.query(
        By.css('.graph-executions-viewport')
      );
      expect(viewPort).not.toBeNull();
      const tensorContainers = fixture.debugElement.queryAll(
        By.css('.tensor-container')
      );
      expect(tensorContainers.length).toBeGreaterThan(0);
      const graphExecutionIndices = fixture.debugElement.queryAll(
        By.css('.graph-execution-index')
      );
      const tensorNames = fixture.debugElement.queryAll(By.css('.tensor-name'));
      const opTypes = fixture.debugElement.queryAll(By.css('.op-type'));
      expect(graphExecutionIndices.length).toBe(tensorContainers.length);
      expect(tensorNames.length).toBe(tensorContainers.length);
      expect(opTypes.length).toBe(tensorContainers.length);
      for (let i = 0; i < tensorNames.length; ++i) {
        expect(graphExecutionIndices[i].nativeElement.innerText).toBe(`${i}`);
        const focusElement = graphExecutionIndices[i].query(
          By.css('.graph-execution-focus')
        );
        if (i === 99) {
          expect(focusElement.nativeElement.innerText).toBe('▶');
        } else {
          expect(focusElement).toBeNull();
        }
        expect(tensorNames[i].nativeElement.innerText).toBe(`TestOp_${i}:0`);
        expect(tensorNames[i].nativeElement.title).toBe(`TestOp_${i}:0`);
        expect(opTypes[i].nativeElement.innerText).toBe(`OpType_${i}`);
      }
      const debugTensorValueElements = fixture.debugElement.queryAll(
        By.css('debug-tensor-value')
      );
      expect(debugTensorValueElements.length).toBe(tensorContainers.length);
      // Check the highlighting of inputs to the focused graph execution event.
      const inputsOfFocus = fixture.debugElement.queryAll(
        By.css('.input-of-focus')
      );
      expect(inputsOfFocus.length).toBe(2);
      expect(
        inputsOfFocus[0].query(By.css('.graph-execution-index')).nativeElement
          .innerText
      ).toBe('1');
      expect(
        inputsOfFocus[1].query(By.css('.graph-execution-index')).nativeElement
          .innerText
      ).toBe('2');
    })
  );

  it('dispatches graphExecutionFocused on tensor name click', fakeAsync(() => {
    const fixture = TestBed.createComponent(GraphExecutionsContainer);
    store.overrideSelector(getNumGraphExecutions, 2);
    store.overrideSelector(getGraphExecutionData, {
      0: graphExecutionData[0],
      1: graphExecutionData[1],
    });
    fixture.autoDetectChanges();
    tick();

    const dispatchSpy = spyOn(store, 'dispatch');
    const tensorNames = fixture.debugElement.queryAll(By.css('.tensor-name'));
    expect(tensorNames.length).toBe(2);
    tensorNames[0].nativeElement.click();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      graphExecutionFocused({
        index: 0,
        graph_id: 'g2',
        op_name: 'TestOp_0',
      })
    );
    tensorNames[1].nativeElement.click();
    expect(dispatchSpy).toHaveBeenCalledTimes(2);
    expect(dispatchSpy).toHaveBeenCalledWith(
      graphExecutionFocused({
        index: 1,
        graph_id: 'g2',
        op_name: 'TestOp_1',
      })
    );
  }));

  it('renders # execs and execs viewport if # execs > 0; not loaded', fakeAsync(() => {
    const fixture = TestBed.createComponent(GraphExecutionsContainer);
    store.overrideSelector(getNumGraphExecutions, 120);
    store.overrideSelector(getGraphExecutionData, {});
    fixture.autoDetectChanges();
    tick();

    const titleElement = fixture.debugElement.query(
      By.css('.graph-executions-title')
    );
    expect(titleElement.nativeElement.innerText).toBe('Graph Executions (120)');
    const viewPort = fixture.debugElement.query(
      By.css('.graph-executions-viewport')
    );
    expect(viewPort).not.toBeNull();
    const tensorContainers = fixture.debugElement.queryAll(
      By.css('.tensor-container')
    );
    expect(tensorContainers.length).toBeGreaterThan(0);
    const graphExecutionIndices = fixture.debugElement.queryAll(
      By.css('.graph-execution-index')
    );
    const loadingElements = fixture.debugElement.queryAll(
      By.css('.loading-spinner')
    );
    const tensorNames = fixture.debugElement.queryAll(By.css('.tensor-name'));
    const opTypes = fixture.debugElement.queryAll(By.css('.op-type'));
    expect(graphExecutionIndices.length).toBe(tensorContainers.length);
    expect(loadingElements.length).toBe(tensorContainers.length);
    expect(tensorNames.length).toBe(0);
    expect(opTypes.length).toBe(0);
  }));

  for (const oldFocusIndex of [null, 0, 119]) {
    for (const newFocusIndex of [1, 60, 100, 118]) {
      it(
        `calls scrollToIndex on focusIndex change: ` +
          `${oldFocusIndex} --> ${newFocusIndex}`,
        fakeAsync(() => {
          const fixture = TestBed.createComponent(GraphExecutionsContainer);
          store.overrideSelector(getNumGraphExecutions, 120);
          store.overrideSelector(getGraphExecutionData, graphExecutionData);
          store.overrideSelector(getGraphExecutionFocusIndex, oldFocusIndex);
          fixture.autoDetectChanges();
          tick();

          const component = fixture.debugElement.query(
            By.css('graph-executions-component')
          ).componentInstance;
          const viewPort =
            component.TEST_ONLY.getViewPort() as CdkVirtualScrollViewport;
          const {start, end} = viewPort.getRenderedRange();
          expect(end).toBeGreaterThan(start);
          const scrollIndices: number[] = [];
          const scrollToIndexSpy = spyOn(
            viewPort,
            'scrollToIndex'
          ).and.callFake((scrollIndex: number) => {
            scrollIndices.push(scrollIndex);
          });

          store.overrideSelector(getGraphExecutionFocusIndex, newFocusIndex);
          store.refreshState();
          fixture.detectChanges();
          tick();

          expect(scrollToIndexSpy).toHaveBeenCalledTimes(1);
          const inRange = newFocusIndex >= start && newFocusIndex < end;
          expect(scrollToIndexSpy).toHaveBeenCalledWith(
            Math.max(newFocusIndex - Math.round(end - start) / 3, 0),
            inRange ? 'smooth' : undefined
          );
        })
      );
    }
  }

  it('no scrolling happens on null focusIndex', fakeAsync(() => {
    const fixture = TestBed.createComponent(GraphExecutionsContainer);
    store.overrideSelector(getNumGraphExecutions, 120);
    store.overrideSelector(getGraphExecutionData, graphExecutionData);
    store.overrideSelector(getGraphExecutionFocusIndex, 99);
    fixture.autoDetectChanges();
    tick();

    const component = fixture.debugElement.query(
      By.css('graph-executions-component')
    ).componentInstance;
    const viewPort =
      component.TEST_ONLY.getViewPort() as CdkVirtualScrollViewport;
    const {start, end} = viewPort.getRenderedRange();
    expect(end).toBeGreaterThan(start);
    const scrollIndices: number[] = [];
    const scrollToIndexSpy = spyOn(viewPort, 'scrollToIndex').and.callFake(
      (scrollIndex: number) => {
        scrollIndices.push(scrollIndex);
      }
    );

    store.overrideSelector(getGraphExecutionFocusIndex, null);
    store.refreshState();
    fixture.detectChanges();
    tick();

    expect(scrollToIndexSpy).not.toHaveBeenCalled();
  }));
});
