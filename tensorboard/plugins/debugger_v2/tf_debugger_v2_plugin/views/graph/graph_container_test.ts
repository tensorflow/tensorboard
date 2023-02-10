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
 * Unit tests for the the graph structure component and container.
 */
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {graphOpFocused} from '../../actions';
import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {
  getFocusedGraphOpConsumers,
  getFocusedGraphOpInfo,
  getFocusedGraphOpInputs,
} from '../../store';
import {State} from '../../store/debugger_types';
import {
  createDebuggerState,
  createState,
  createTestGraphOpInfo,
} from '../../testing';
import {GraphContainer} from './graph_container';
import {GraphModule} from './graph_module';

describe('Graph Container', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      imports: [CommonModule, GraphModule],
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

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders no-op-selected element and nothing else when no op is selected', () => {
    const fixture = TestBed.createComponent(GraphContainer);
    store.overrideSelector(getFocusedGraphOpInfo, null);
    fixture.detectChanges();

    const noOpFocused = fixture.debugElement.query(By.css('.no-op-focused'));
    expect(noOpFocused).not.toBeNull();
    expect(noOpFocused.nativeElement.innerText).toMatch(/No graph op selected/);
    const inputsContainer = fixture.debugElement.query(
      By.css('.inputs-container')
    );
    expect(inputsContainer).toBeNull();
    const selfOpContainer = fixture.debugElement.query(
      By.css('.self-op-container')
    );
    expect(selfOpContainer).toBeNull();
    const consumersContainer = fixture.debugElement.query(
      By.css('.consumers-container')
    );
    expect(consumersContainer).toBeNull();
  });

  for (const inputOutputSlot of [0, 1]) {
    for (const consumerInputSlot of [0, 1]) {
      for (const neighborDataAvailable of [false, true]) {
        it(
          `renders op with 1 input tensor and 1 consumer: ` +
            `inputOutputSlot=${inputOutputSlot}]; ` +
            `consumerInputSlot=${consumerInputSlot}]; ` +
            `neighborDataAvailable=${neighborDataAvailable};`,
          () => {
            const fixture = TestBed.createComponent(GraphContainer);
            const op1 = createTestGraphOpInfo({
              op_name: 'op1',
              op_type: 'InputOp',
            });
            const op2 = createTestGraphOpInfo({
              op_name: 'op2',
              op_type: 'SelfOp',
            });
            const op3 = createTestGraphOpInfo({
              op_name: 'op3',
              op_type: 'ConsumerOp',
            });
            op1.consumers = [
              [
                {
                  op_name: 'op2',
                  input_slot: 0,
                },
              ],
            ];
            op2.inputs = [
              {
                op_name: 'op1',
                output_slot: inputOutputSlot,
              },
            ];
            op2.consumers = [
              [
                {
                  op_name: 'op3',
                  input_slot: consumerInputSlot,
                },
              ],
            ];
            op3.inputs = [
              {
                op_name: 'op2',
                output_slot: 0,
              },
            ];
            store.overrideSelector(getFocusedGraphOpInfo, op2);
            const input = {...op2.inputs[0]};
            if (neighborDataAvailable) input.data = op1;
            store.overrideSelector(getFocusedGraphOpInputs, [input]);
            const consumer = {...op2.consumers[0][0]};
            if (neighborDataAvailable) consumer.data = op3;
            store.overrideSelector(getFocusedGraphOpConsumers, [[consumer]]);

            fixture.detectChanges();

            const noOpFocused = fixture.debugElement.query(
              By.css('.no-op-focused')
            );
            expect(noOpFocused).toBeNull();
            // Check self op section.
            const selfOpContainer = fixture.debugElement.query(
              By.css('.self-op-container')
            );
            const selfOpName = selfOpContainer.query(By.css('.self-op-name'));
            expect(selfOpName.nativeElement.innerText).toBe('op2');
            const selfOpType = selfOpContainer.query(By.css('.op-type'));
            expect(selfOpType.nativeElement.innerText).toBe('SelfOp');
            // Check inputs section.
            const inputsContainer = fixture.debugElement.query(
              By.css('.inputs-container')
            );
            const inputSlotHeaders = inputsContainer.queryAll(
              By.css('.input-slot-header')
            );
            expect(inputSlotHeaders.length).toBe(1);
            expect(inputSlotHeaders[0].nativeElement.innerText).toBe(
              'Input slot 0:'
            );
            const inputOpNames = inputsContainer.queryAll(By.css('.op-name'));
            expect(inputOpNames.length).toBe(1);
            expect(inputOpNames[0].nativeElement.innerText).toBe('op1');
            const inputOutputSlots = inputsContainer.queryAll(By.css('.slot'));
            expect(inputOutputSlots.length).toBe(1);
            expect(inputOutputSlots[0].nativeElement.innerText).toBe(
              `Output slot: ${inputOutputSlot}`
            );
            // Clicking input op name should dispatch graphOpFocused.
            inputOpNames[0].nativeElement.click();
            expect(dispatchSpy).toHaveBeenCalledTimes(1);
            expect(dispatchSpy).toHaveBeenCalledWith(
              graphOpFocused({
                graph_id: op1.graph_ids[op1.graph_ids.length - 1],
                op_name: 'op1',
              })
            );
            const inputOpTypes = inputsContainer.queryAll(By.css('.op-type'));
            if (neighborDataAvailable) {
              expect(inputOpTypes.length).toBe(1);
              expect(inputOpTypes[0].nativeElement.innerText).toBe('InputOp');
            } else {
              expect(inputOpTypes.length).toBe(0);
              const opInfoMissing = inputsContainer.query(
                By.css('.op-info-missing')
              );
              expect(opInfoMissing.nativeElement.innerText).toBe(
                '(Op info unavailable.)'
              );
            }
            // Check consumers section.
            const consumersContainer = fixture.debugElement.query(
              By.css('.consumers-container')
            );
            const slotConsumersContainers = consumersContainer.queryAll(
              By.css('.slot-consumers-container')
            );
            expect(slotConsumersContainers.length).toBe(1);
            const slotConsumersContainer = slotConsumersContainers[0];
            const slotConsumersHeader = slotConsumersContainer.queryAll(
              By.css('.slot-consumers-header')
            );
            expect(slotConsumersHeader.length).toBe(1);
            expect(slotConsumersHeader[0].nativeElement.innerText).toBe(
              'Output slot 0: (1 consumer)'
            );
            const consumerOpNames = slotConsumersContainer.queryAll(
              By.css('.op-name')
            );
            expect(consumerOpNames.length).toBe(1);
            expect(consumerOpNames[0].nativeElement.innerText).toBe('op3');
            // Clicking consumer op name should dispatch graphOpFocused.
            consumerOpNames[0].nativeElement.click();
            expect(dispatchSpy).toHaveBeenCalledTimes(2);
            expect(dispatchSpy).toHaveBeenCalledWith(
              graphOpFocused({
                graph_id: op3.graph_ids[op3.graph_ids.length - 1],
                op_name: 'op3',
              })
            );
            const consumerInputSlots = slotConsumersContainer.queryAll(
              By.css('.slot')
            );
            expect(consumerInputSlots.length).toBe(1);
            expect(consumerInputSlots[0].nativeElement.innerText).toBe(
              `Input slot: ${consumerInputSlot}`
            );
            const consumerOpTypes = slotConsumersContainer.queryAll(
              By.css('.op-type')
            );
            if (neighborDataAvailable) {
              expect(consumerOpTypes.length).toBe(1);
              expect(consumerOpTypes[0].nativeElement.innerText).toBe(
                'ConsumerOp'
              );
            } else {
              expect(consumerOpTypes.length).toBe(0);
              const opInfoMissing = slotConsumersContainer.query(
                By.css('.op-info-missing')
              );
              expect(opInfoMissing.nativeElement.innerText).toBe(
                '(Op info unavailable.)'
              );
            }
          }
        );
      }
    }
  }

  it(
    'renders op with no input tensor and 2 consumers for 1 slot: ' +
      'data available',
    () => {
      const fixture = TestBed.createComponent(GraphContainer);
      const op1 = createTestGraphOpInfo({
        op_name: 'op1',
        op_type: 'SelfOp',
      });
      const op2a = createTestGraphOpInfo({
        op_name: 'op2a',
        op_type: 'ConsumerAOp',
      });
      const op2b = createTestGraphOpInfo({
        op_name: 'op2b',
        op_type: 'ConsumerBOp',
      });
      op1.inputs = [];
      op1.consumers = [
        [
          {
            op_name: 'op2a',
            input_slot: 0,
          },
          {
            op_name: 'op2b',
            input_slot: 0,
          },
        ],
      ];
      op2a.inputs = [
        {
          op_name: 'op1',
          output_slot: 0,
        },
      ];
      op2b.inputs = [
        {
          op_name: 'op1',
          output_slot: 0,
        },
      ];
      store.overrideSelector(getFocusedGraphOpInfo, op1);
      store.overrideSelector(getFocusedGraphOpInputs, []);
      store.overrideSelector(getFocusedGraphOpConsumers, [
        [
          {
            ...op1.consumers[0][0],
            data: op2a,
          },
          {
            ...op1.consumers[0][1],
            data: op2b,
          },
        ],
      ]);

      fixture.detectChanges();

      const noOpFocused = fixture.debugElement.query(By.css('.no-op-focused'));
      expect(noOpFocused).toBeNull();
      // Check self op section.
      const selfOpContainer = fixture.debugElement.query(
        By.css('.self-op-container')
      );
      const selfOpName = selfOpContainer.query(By.css('.self-op-name'));
      expect(selfOpName.nativeElement.innerText).toBe('op1');
      const selfOpType = selfOpContainer.query(By.css('.op-type'));
      expect(selfOpType.nativeElement.innerText).toBe('SelfOp');
      // Check inputs section.
      const inputsContainer = fixture.debugElement.query(
        By.css('.inputs-container')
      );
      const inputOpSections = inputsContainer.queryAll(
        By.css('.input-op-section')
      );
      expect(inputOpSections.length).toBe(0);
      const noInputsIndicator = fixture.debugElement.query(
        By.css('.no-inputs-indicator')
      );
      expect(noInputsIndicator.nativeElement.innerText).toBe(
        '(This op has no input tensor.)'
      );
      // Check consumers section.
      const consumersContainer = fixture.debugElement.query(
        By.css('.consumers-container')
      );
      const slotConsumersContainers = consumersContainer.queryAll(
        By.css('.slot-consumers-container')
      );
      expect(slotConsumersContainers.length).toBe(1);
      const slotConsumersContainer = slotConsumersContainers[0];
      const slotConsumersHeader = slotConsumersContainer.queryAll(
        By.css('.slot-consumers-header')
      );
      expect(slotConsumersHeader.length).toBe(1);
      expect(slotConsumersHeader[0].nativeElement.innerText).toBe(
        'Output slot 0: (2 consumers)'
      );
      const consumerOpNames = slotConsumersContainer.queryAll(
        By.css('.op-name')
      );
      expect(consumerOpNames.length).toBe(2);
      expect(consumerOpNames[0].nativeElement.innerText).toBe('op2a');
      expect(consumerOpNames[1].nativeElement.innerText).toBe('op2b');
      const consumerInputSlots = slotConsumersContainer.queryAll(
        By.css('.slot')
      );
      expect(consumerInputSlots.length).toBe(2);
      expect(consumerInputSlots[0].nativeElement.innerText).toBe(
        `Input slot: 0`
      );
      expect(consumerInputSlots[1].nativeElement.innerText).toBe(
        `Input slot: 0`
      );
      const consumerOpTypes = slotConsumersContainer.queryAll(
        By.css('.op-type')
      );
      expect(consumerOpTypes.length).toBe(2);
      expect(consumerOpTypes[0].nativeElement.innerText).toBe('ConsumerAOp');
      expect(consumerOpTypes[1].nativeElement.innerText).toBe('ConsumerBOp');
    }
  );

  it(
    'renders op with no input tensor 2 consumers for 2 slots: ' +
      'data available',
    () => {
      const fixture = TestBed.createComponent(GraphContainer);
      const op1 = createTestGraphOpInfo({
        op_name: 'op1',
        op_type: 'SelfOp',
      });
      const op2a = createTestGraphOpInfo({
        op_name: 'op2a',
        op_type: 'ConsumerAOp',
      });
      const op2b = createTestGraphOpInfo({
        op_name: 'op2b',
        op_type: 'ConsumerBOp',
      });
      op1.inputs = [];
      op1.consumers = [
        [
          {
            op_name: 'op2a',
            input_slot: 0,
          },
        ],
        [
          {
            op_name: 'op2b',
            input_slot: 0,
          },
        ],
      ];
      op2a.inputs = [
        {
          op_name: 'op1',
          output_slot: 0,
        },
      ];
      op2b.inputs = [
        {
          op_name: 'op1',
          output_slot: 1,
        },
      ];
      store.overrideSelector(getFocusedGraphOpInfo, op1);
      store.overrideSelector(getFocusedGraphOpInputs, []);
      store.overrideSelector(getFocusedGraphOpConsumers, [
        [
          {
            ...op1.consumers[0][0],
            data: op2a,
          },
        ],
        [
          {
            ...op1.consumers[1][0],
            data: op2b,
          },
        ],
      ]);

      fixture.detectChanges();

      const noOpFocused = fixture.debugElement.query(By.css('.no-op-focused'));
      expect(noOpFocused).toBeNull();
      // Check self op section.
      const selfOpContainer = fixture.debugElement.query(
        By.css('.self-op-container')
      );
      const selfOpName = selfOpContainer.query(By.css('.self-op-name'));
      expect(selfOpName.nativeElement.innerText).toBe('op1');
      const selfOpType = selfOpContainer.query(By.css('.op-type'));
      expect(selfOpType.nativeElement.innerText).toBe('SelfOp');
      // Check inputs section.
      const inputsContainer = fixture.debugElement.query(
        By.css('.inputs-container')
      );
      const inputOpSections = inputsContainer.queryAll(
        By.css('.input-op-section')
      );
      expect(inputOpSections.length).toBe(0);
      const noInputsIndicator = fixture.debugElement.query(
        By.css('.no-inputs-indicator')
      );
      expect(noInputsIndicator.nativeElement.innerText).toBe(
        '(This op has no input tensor.)'
      );
      // Check consumers section.
      const consumersContainer = fixture.debugElement.query(
        By.css('.consumers-container')
      );
      const slotConsumersContainers = consumersContainer.queryAll(
        By.css('.slot-consumers-container')
      );
      expect(slotConsumersContainers.length).toBe(2);
      const [slotConsumersContainer0, slotConsumersContainer1] =
        slotConsumersContainers;
      // 1st output slot.
      let slotConsumersHeader = slotConsumersContainer0.queryAll(
        By.css('.slot-consumers-header')
      );
      expect(slotConsumersHeader.length).toBe(1);
      expect(slotConsumersHeader[0].nativeElement.innerText).toBe(
        'Output slot 0: (1 consumer)'
      );
      let consumerOpNames = slotConsumersContainer0.queryAll(
        By.css('.op-name')
      );
      expect(consumerOpNames.length).toBe(1);
      expect(consumerOpNames[0].nativeElement.innerText).toBe('op2a');
      let consumerInputSlots = slotConsumersContainer0.queryAll(
        By.css('.slot')
      );
      expect(consumerInputSlots.length).toBe(1);
      expect(consumerInputSlots[0].nativeElement.innerText).toBe(
        `Input slot: 0`
      );
      let consumerOpTypes = slotConsumersContainer0.queryAll(
        By.css('.op-type')
      );
      expect(consumerOpTypes.length).toBe(1);
      expect(consumerOpTypes[0].nativeElement.innerText).toBe('ConsumerAOp');
      // 2nd output slot.
      slotConsumersHeader = slotConsumersContainer1.queryAll(
        By.css('.slot-consumers-header')
      );
      expect(slotConsumersHeader.length).toBe(1);
      expect(slotConsumersHeader[0].nativeElement.innerText).toBe(
        'Output slot 1: (1 consumer)'
      );
      consumerOpNames = slotConsumersContainer1.queryAll(By.css('.op-name'));
      expect(consumerOpNames.length).toBe(1);
      expect(consumerOpNames[0].nativeElement.innerText).toEqual('op2b');
      consumerInputSlots = slotConsumersContainer1.queryAll(By.css('.slot'));
      expect(consumerInputSlots.length).toBe(1);
      expect(consumerInputSlots[0].nativeElement.innerText).toBe(
        `Input slot: 0`
      );
      consumerOpTypes = slotConsumersContainer1.queryAll(By.css('.op-type'));
      expect(consumerOpTypes.length).toBe(1);
      expect(consumerOpTypes[0].nativeElement.innerText).toBe('ConsumerBOp');
    }
  );

  it('renders op with 2 input tensor and no consumer: data available', () => {
    const fixture = TestBed.createComponent(GraphContainer);
    const op1a = createTestGraphOpInfo({
      op_name: 'op1a',
      op_type: 'InputAOp',
    });
    const op1b = createTestGraphOpInfo({
      op_name: 'op1b',
      op_type: 'InputBOp',
    });
    const op2 = createTestGraphOpInfo({
      op_name: 'op2',
      op_type: 'SelfOp',
    });
    op1a.consumers = [
      [
        {
          op_name: 'op2',
          input_slot: 0,
        },
      ],
    ];
    op1b.consumers = [
      [
        {
          op_name: 'op2',
          input_slot: 0,
        },
      ],
    ];
    op2.inputs = [
      {
        op_name: 'op1a',
        output_slot: 0,
      },
      {
        op_name: 'op1b',
        output_slot: 0,
      },
    ];
    op2.consumers = [[]];
    store.overrideSelector(getFocusedGraphOpInfo, op2);
    store.overrideSelector(getFocusedGraphOpInputs, [
      {
        ...op2.inputs[0],
        data: op1a,
      },
      {
        ...op2.inputs[1],
        data: op1b,
      },
    ]);
    store.overrideSelector(getFocusedGraphOpConsumers, [[]]);
    fixture.detectChanges();

    const noOpFocused = fixture.debugElement.query(By.css('.no-op-focused'));
    expect(noOpFocused).toBeNull();
    // Check self op section.
    const selfOpContainer = fixture.debugElement.query(
      By.css('.self-op-container')
    );
    const selfOpName = selfOpContainer.query(By.css('.self-op-name'));
    expect(selfOpName.nativeElement.innerText).toBe('op2');
    const selfOpType = selfOpContainer.query(By.css('.op-type'));
    expect(selfOpType.nativeElement.innerText).toBe('SelfOp');
    // Check inputs section.
    const inputsContainer = fixture.debugElement.query(
      By.css('.inputs-container')
    );
    const inputSlotHeaders = inputsContainer.queryAll(
      By.css('.input-slot-header')
    );
    expect(inputSlotHeaders.length).toBe(2);
    expect(inputSlotHeaders[0].nativeElement.innerText).toBe('Input slot 0:');
    expect(inputSlotHeaders[1].nativeElement.innerText).toBe('Input slot 1:');
    const inputOpNames = inputsContainer.queryAll(By.css('.op-name'));
    expect(inputOpNames.length).toBe(2);
    expect(inputOpNames[0].nativeElement.innerText).toBe('op1a');
    expect(inputOpNames[1].nativeElement.innerText).toBe('op1b');
    const inputOutputSlots = inputsContainer.queryAll(By.css('.slot'));
    expect(inputOutputSlots.length).toBe(2);
    expect(inputOutputSlots[0].nativeElement.innerText).toBe('Output slot: 0');
    expect(inputOutputSlots[1].nativeElement.innerText).toBe('Output slot: 0');
    const inputOpTypes = inputsContainer.queryAll(By.css('.op-type'));
    expect(inputOpTypes.length).toBe(2);
    expect(inputOpTypes[0].nativeElement.innerText).toBe('InputAOp');
    expect(inputOpTypes[1].nativeElement.innerText).toBe('InputBOp');
    // Check consumers section.
    const noConsumers = fixture.debugElement.query(
      By.css('.op-consumers-container')
    );
    expect(noConsumers.nativeElement.innerText).toBe(
      '(This op has 1 output tensor and no consumer.)'
    );
  });
});
