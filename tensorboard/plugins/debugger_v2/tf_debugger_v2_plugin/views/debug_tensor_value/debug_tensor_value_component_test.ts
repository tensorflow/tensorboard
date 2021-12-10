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
import {TensorDebugMode} from '../../store/debugger_types';
import {parseDebugTensorValue} from '../../store/debug_tensor_value';
import {
  DebugTensorDTypeComponent,
  DebugTensorHasInfOrNaNComponent,
  DebugTensorNumericBreakdownComponent,
  DebugTensorRankComponent,
  DebugTensorShapeComponent,
  DebugTensorValueComponent,
} from './debug_tensor_value_component';

describe('debug-tensor-value components', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        DebugTensorDTypeComponent,
        DebugTensorHasInfOrNaNComponent,
        DebugTensorNumericBreakdownComponent,
        DebugTensorRankComponent,
        DebugTensorShapeComponent,
        DebugTensorValueComponent,
      ],
    }).compileComponents();
  });

  describe('DebugTensorDTypeComponent', () => {
    it('displays correct dtype', () => {
      const fixture = TestBed.createComponent(DebugTensorDTypeComponent);
      const component = fixture.componentInstance;
      component.dtype = 'bfloat16';
      fixture.detectChanges();
      expect(fixture.nativeElement.innerText).toBe('bfloat16');
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
        expect(fixture.nativeElement.innerText).toBe(expectedDimText);
      });
    }
  });

  describe('DebugTensorShapeComponent', () => {
    for (const [shape, expectedShapeText] of [
      [[], 'shape:[]'],
      [[30], 'shape:[30]'],
      [[4, 5], 'shape:[4,5]'],
      [[1, 4, 5], 'shape:[1,4,5]'],
      [[1, 3, 3, 7], 'shape:[1,3,3,7]'],
      [[1, 2, 3, 4, 5], 'shape:[1,2,3,4,5]'],
      [[0, 1, 2, 3, 4, 5], 'shape:[0,1,2,3,4,5]'],
      [[undefined, 1, 3, 3, 7, 10, 20], 'shape:[?,1,3,3,7,10,20]'],
      [[undefined, undefined, 1, 3, 3, 7, 10, 20], 'shape:[?,?,1,3,3,7,10,20]'],
    ] as Array<[Array<number | undefined>, string]>) {
      it(`displays correct shape: ${JSON.stringify(expectedShapeText)}`, () => {
        const fixture = TestBed.createComponent(DebugTensorShapeComponent);
        const component = fixture.componentInstance;
        component.shape = shape;
        fixture.detectChanges();
        expect(fixture.nativeElement.innerText).toBe(expectedShapeText);
      });
    }
  });

  describe('DebugTensorNumericBreakdownComponent', () => {
    it('No breakdown available: displays size only', () => {
      const fixture = TestBed.createComponent(
        DebugTensorNumericBreakdownComponent
      );
      const component = fixture.componentInstance;
      component.size = 345;
      fixture.detectChanges();
      const sizeElement = fixture.debugElement.query(By.css('.size-value'));
      expect(sizeElement.nativeElement.innerText).toBe('345');
      const breakdownElement = fixture.debugElement.query(By.css('.breakdown'));
      expect(breakdownElement).toBeNull();
    });

    it('displays size and number of finite elements', () => {
      const fixture = TestBed.createComponent(
        DebugTensorNumericBreakdownComponent
      );
      const component = fixture.componentInstance;
      component.size = 345;
      component.numNegativeFinites = 300;
      component.numZeros = 40;
      component.numPositiveFinites = 5;
      fixture.detectChanges();
      const sizeElement = fixture.debugElement.query(By.css('.size-value'));
      expect(sizeElement.nativeElement.innerText).toBe('345');
      const breakdownElement = fixture.debugElement.query(By.css('.breakdown'));
      expect(breakdownElement).not.toBeNull();
      const tagElements = fixture.debugElement.queryAll(
        By.css('.category-tag')
      );
      const countElements = fixture.debugElement.queryAll(
        By.css('.category-count')
      );
      expect(tagElements.length).toBe(3);
      expect(countElements.length).toBe(3);
      expect(tagElements[0].nativeElement.innerText).toBe('-');
      expect(countElements[0].nativeElement.innerText).toBe('×300');
      expect(tagElements[1].nativeElement.innerText).toBe('0');
      expect(countElements[1].nativeElement.innerText).toBe('×40');
      expect(tagElements[2].nativeElement.innerText).toBe('+');
      expect(countElements[2].nativeElement.innerText).toBe('×5');
    });

    it('displays size and number of infinite elements', () => {
      const fixture = TestBed.createComponent(
        DebugTensorNumericBreakdownComponent
      );
      const component = fixture.componentInstance;
      component.size = 345;
      component.numNaNs = 300;
      component.numNegativeInfs = 40;
      component.numPositiveInfs = 5;
      fixture.detectChanges();
      const sizeElement = fixture.debugElement.query(By.css('.size-value'));
      expect(sizeElement.nativeElement.innerText).toBe('345');
      const breakdownElement = fixture.debugElement.query(By.css('.breakdown'));
      expect(breakdownElement).not.toBeNull();
      const tagElements = fixture.debugElement.queryAll(
        By.css('.category-tag')
      );
      const countElements = fixture.debugElement.queryAll(
        By.css('.category-count')
      );
      expect(tagElements.length).toBe(3);
      expect(countElements.length).toBe(3);
      expect(tagElements[0].nativeElement.innerText).toBe('NaN');
      expect(countElements[0].nativeElement.innerText).toBe('×300');
      expect(tagElements[1].nativeElement.innerText).toBe('-∞');
      expect(countElements[1].nativeElement.innerText).toBe('×40');
      expect(tagElements[2].nativeElement.innerText).toBe('+∞');
      expect(countElements[2].nativeElement.innerText).toBe('×5');
    });
  });

  describe('DebugTensorHasInfOrNaNComponent', () => {
    it('displays no inf or nan', () => {
      const fixture = TestBed.createComponent(DebugTensorHasInfOrNaNComponent);
      const component = fixture.componentInstance;
      component.hasInfOrNaN = false;
      fixture.detectChanges();
      expect(fixture.nativeElement.innerText).toBe('No ∞/NaN');
    });

    it('displays has inf or nan', () => {
      const fixture = TestBed.createComponent(DebugTensorHasInfOrNaNComponent);
      const component = fixture.componentInstance;
      component.hasInfOrNaN = true;
      fixture.detectChanges();
      expect(fixture.nativeElement.innerText).toBe('Has ∞/NaN');
    });
  });

  describe('DebugTensorValueComponent', () => {
    it('displays CURT_HEALTH data', () => {
      const fixture = TestBed.createComponent(DebugTensorValueComponent);
      const component = fixture.componentInstance;
      component.debugTensorValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.CURT_HEALTH,
        array: [123, 0],
      });
      fixture.detectChanges();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-has-inf-or-nan'))
      ).not.toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-dtype'))
      ).toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-shape'))
      ).toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-numeric-breakdown'))
      ).toBeNull();
    });

    it('displays CONCISE_HEALTH data', () => {
      const fixture = TestBed.createComponent(DebugTensorValueComponent);
      const component = fixture.componentInstance;
      component.debugTensorValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.CONCISE_HEALTH,
        array: [123, 345, 300, 40, 5],
      });
      fixture.detectChanges();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-has-inf-or-nan'))
      ).toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-dtype'))
      ).toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-shape'))
      ).toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-numeric-breakdown'))
      ).not.toBeNull();
    });

    it('displays SHAPE data', () => {
      const fixture = TestBed.createComponent(DebugTensorValueComponent);
      const component = fixture.componentInstance;
      component.debugTensorValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.SHAPE,
        array: [123, 5, 7, 1200, 3, 4, 1, 2, 1, 5],
      });
      fixture.detectChanges();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-has-inf-or-nan'))
      ).toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-dtype'))
      ).not.toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-shape'))
      ).not.toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-numeric-breakdown'))
      ).not.toBeNull();
    });

    it('displays FULL_HEALTH data', () => {
      const fixture = TestBed.createComponent(DebugTensorValueComponent);
      const component = fixture.componentInstance;
      component.debugTensorValue = parseDebugTensorValue({
        tensorDebugMode: TensorDebugMode.FULL_HEALTH,
        array: [123, 0, 1, 2, 600, 0, 0, 0, 100, 200, 300],
      });
      fixture.detectChanges();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-has-inf-or-nan'))
      ).toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-dtype'))
      ).not.toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-shape'))
      ).toBeNull();
      expect(
        fixture.debugElement.query(By.css('debug-tensor-numeric-breakdown'))
      ).not.toBeNull();
    });
  });
});
