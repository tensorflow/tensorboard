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
 * Unit tests for the Timeline Container.
 */
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {
  executionScrollLeft,
  executionScrollRight,
  executionScrollToIndex,
} from '../../actions';
import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {getNumExecutions} from '../../store';
import {AlertType, State} from '../../store/debugger_types';
import {
  createAlertsState,
  createDebuggerState,
  createDebuggerStateWithLoadedExecutionDigests,
  createState,
} from '../../testing';
import {TEST_ONLY, TimelineContainer} from './timeline_container';
import {TimelineModule} from './timeline_module';

describe('getExecutionDigestForDisplay', () => {
  for (const [opType, strLen, expectedShortOpType, isGraph] of [
    ['MatMul', 1, 'M', false],
    ['MatMul', 2, 'Ma', false],
    ['MatMul', 3, 'Mat', false],
    ['MatMul', 100, 'MatMul', false],
    ['__inference_batchnorm_1357', 1, 'b', true],
    ['__forward_batchnorm_1357', 2, 'ba', true],
    ['__backward_attention_1357', 3, 'att', true],
    ['__backward_attention_1357', 99, 'attention_1357', true],
  ] as Array<[string, number, string, boolean]>) {
    it(`outputs correct results for op ${opType}, strLen=${strLen}`, () => {
      const display = TEST_ONLY.getExecutionDigestForDisplay(
        {
          op_type: opType,
          output_tensor_device_ids: ['d0'],
        },
        strLen
      );
      expect(display.short_op_type).toEqual(expectedShortOpType);
      expect(display.op_type).toEqual(opType);
      expect(display.is_graph).toBe(isGraph);
    });
  }

  it(`outputs ellipses for unavailable op`, () => {
    const display = TEST_ONLY.getExecutionDigestForDisplay(null);
    expect(display.short_op_type).toEqual('..');
    expect(display.op_type).toEqual('(N/A)');
    expect(display.is_graph).toEqual(false);
  });
});

describe('Timeline Container', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      imports: [CommonModule, TimelineModule],
      providers: [
        provideMockStore({
          initialState: createState(createDebuggerState()),
        }),
        DebuggerContainer,
        TimelineContainer,
      ],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch');
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('shows total number of executions', () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();

    const scrollBeginIndex = 977;
    const dislpaySize = 100;
    store.setState(
      createState(
        createDebuggerStateWithLoadedExecutionDigests(
          scrollBeginIndex,
          dislpaySize
        )
      )
    );
    fixture.detectChanges();
  });

  it('shows correct display range for executions', () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();

    store.overrideSelector(getNumExecutions, 42);
    store.refreshState();
    fixture.detectChanges();

    const executionCountElement = fixture.debugElement.query(
      By.css('.execution-count')
    );
    expect(executionCountElement.nativeElement.innerText).toBe('(42)');
  });

  it('left-button click dispatches executionScrollLeft action', () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();
    store.setState(
      createState(createDebuggerStateWithLoadedExecutionDigests(0, 50))
    );
    fixture.detectChanges();

    const leftBUtton = fixture.debugElement.query(
      By.css('.navigation-button-left')
    );
    leftBUtton.nativeElement.click();
    fixture.detectChanges();
    expect(dispatchSpy).toHaveBeenCalledWith(executionScrollLeft());
  });

  it('right-button click dispatches executionScrollRight action', () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();
    store.setState(
      createState(createDebuggerStateWithLoadedExecutionDigests(0, 50))
    );
    fixture.detectChanges();

    const rightButton = fixture.debugElement.query(
      By.css('.navigation-button-right')
    );
    rightButton.nativeElement.click();
    fixture.detectChanges();
    expect(dispatchSpy).toHaveBeenCalledWith(executionScrollRight());
  });

  it('displays correct op names', () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();
    const scrollBeginIndex = 100;
    const displayCount = 40;
    const opTypes: string[] = [];
    for (let i = 0; i < 200; ++i) {
      opTypes.push(`${i}Op`);
    }
    store.setState(
      createState(
        createDebuggerStateWithLoadedExecutionDigests(
          scrollBeginIndex,
          displayCount,
          opTypes
        )
      )
    );
    fixture.detectChanges();

    const executionDigests = fixture.debugElement.queryAll(
      By.css('.execution-digest')
    );
    expect(executionDigests.length).toEqual(40);
    const strLen = 1;
    for (let i = 0; i < 40; ++i) {
      expect(executionDigests[i].nativeElement.innerText).toEqual(
        opTypes[i + 100].slice(0, strLen)
      );
    }
  });

  it('displays correct InfNanAlert alert type', () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();
    const scrollBeginIndex = 5;
    const displayCount = 4;
    const opTypes: string[] = [];
    for (let i = 0; i < 200; ++i) {
      opTypes.push(`${i}Op`);
    }
    const debuggerState = createDebuggerStateWithLoadedExecutionDigests(
      scrollBeginIndex,
      displayCount,
      opTypes
    );
    debuggerState.alerts = createAlertsState({
      focusType: AlertType.INF_NAN_ALERT,
      executionIndices: {
        [AlertType.INF_NAN_ALERT]: [
          4, // Outside the viewing window.
          6, // Inside the viewing window; same below.
          8,
        ],
      },
    });
    store.setState(createState(debuggerState));
    fixture.detectChanges();

    const digestsWithAlert = fixture.debugElement.queryAll(
      By.css('.execution-digest.InfNanAlert')
    );
    expect(digestsWithAlert.length).toBe(2);
    expect(digestsWithAlert[0].nativeElement.innerText).toEqual('6');
    expect(digestsWithAlert[1].nativeElement.innerText).toEqual('8');
  });

  for (const numExecutions of [1, 9, 10]) {
    it(`hides slider if # of executions ${numExecutions} <= display count`, () => {
      const fixture = TestBed.createComponent(TimelineContainer);
      fixture.detectChanges();
      const scrollBeginIndex = 0;
      const displayCount = 10;
      const opTypes: string[] = new Array<string>(numExecutions);
      opTypes.fill('MatMul');
      const debuggerState = createDebuggerStateWithLoadedExecutionDigests(
        scrollBeginIndex,
        displayCount,
        opTypes
      );
      store.setState(createState(debuggerState));
      fixture.detectChanges();

      const sliders = fixture.debugElement.queryAll(By.css('.timeline-slider'));
      expect(sliders.length).toBe(0);
    });
  }

  for (const numExecutions of [11, 12, 20]) {
    const displayCount = 10;
    for (const scrollBeginIndex of [0, 1, numExecutions - displayCount]) {
      it(
        `shows slider if # of executions ${numExecutions} > display count, ` +
          `scrollBeginIndex = ${scrollBeginIndex}`,
        () => {
          const fixture = TestBed.createComponent(TimelineContainer);
          fixture.detectChanges();
          const opTypes: string[] = new Array<string>(numExecutions);
          opTypes.fill('MatMul');
          const debuggerState = createDebuggerStateWithLoadedExecutionDigests(
            scrollBeginIndex,
            displayCount,
            opTypes
          );
          store.setState(createState(debuggerState));
          fixture.detectChanges();

          const sliders = fixture.debugElement.queryAll(
            By.css('.timeline-slider')
          );
          expect(sliders.length).toBe(1);
          const [slider] = sliders;
          expect(slider.attributes['ng-reflect-min']).toBe('0');
          expect(slider.attributes['ng-reflect-max']).toBe(
            String(numExecutions - displayCount)
          );
          const thumb = slider.query(By.css('input'));
          expect(thumb.attributes['aria-valuetext']).toBe(
            String(scrollBeginIndex)
          );
        }
      );
    }
  }

  for (const scrollBeginIndex of [0, 1, 5]) {
    it(`changes slider dispatches executionToScrollIndex (${scrollBeginIndex})`, () => {
      const fixture = TestBed.createComponent(TimelineContainer);
      fixture.detectChanges();
      const numExecutions = 10;
      const displayCount = 5;
      const opTypes: string[] = new Array<string>(numExecutions);
      opTypes.fill('MatMul');
      const debuggerState = createDebuggerStateWithLoadedExecutionDigests(
        scrollBeginIndex,
        displayCount,
        opTypes
      );
      store.setState(createState(debuggerState));
      fixture.detectChanges();

      const thumb = fixture.debugElement.query(
        By.css('.timeline-slider input')
      );

      thumb.triggerEventHandler('valueChange', scrollBeginIndex);
      fixture.detectChanges();
      expect(dispatchSpy).toHaveBeenCalledWith(
        executionScrollToIndex({index: scrollBeginIndex})
      );
    });
  }
});
