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
 * Unit tests for the the DebugTensorValue Angular component.
 */

import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {
  DebugTensorDTypeComponent,
  DebugTensorRankComponent,
} from './debug_tensor_value_component';

fdescribe('debug-tensor-value components', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebugTensorDTypeComponent, DebugTensorRankComponent],
    }).compileComponents();
  });

  describe('DebugTensorDTypeComponent', () => {
    it('displays correct dtype', () => {
      const fixture = TestBed.createComponent(DebugTensorDTypeComponent);
      const component = fixture.componentInstance;
      component.dtype = 'bfloat16';
      fixture.detectChanges();
      const dtypeNameElement = fixture.debugElement.query(
        By.css('.dtype-name')
      );
      expect(dtypeNameElement.nativeElement.innerText).toBe('bfloat16');
    });
  });

  describe('DebugTensorRankComponent', () => {
    for (const [rank, expectedDimText] of [
      [0, '0D'],
      [1, '1D'],
      [2, '2D'],
      [6, '6D'],
    ] as Array<[number, string]>) {
      it(`displays correct rank=${rank}`, () => {
        const fixture = TestBed.createComponent(DebugTensorRankComponent);
        const component = fixture.componentInstance;
        component.rank = rank;
        fixture.detectChanges();
        const rankElement = fixture.debugElement.query(By.css('.rank-name'));
        expect(rankElement.nativeElement.innerText).toBe(expectedDimText);
      });
    }
  });
});
