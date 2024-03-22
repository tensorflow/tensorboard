/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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

import {isMouseEventInElement} from './dom';

describe('dom utils', () => {
  describe('isMouseEventInElement', () => {
    [
      {
        testDesc: 'click is to the left of element',
        clientX: 99,
        clientY: 150,
      },
      {
        testDesc: 'click is to the right of element',
        clientX: 201,
        clientY: 150,
      },
      {
        testDesc: 'click is above element',
        clientX: 150,
        clientY: 99,
      },
      {
        testDesc: 'click is below element',
        clientX: 150,
        clientY: 201,
      },
    ].forEach(({testDesc, clientX, clientY}) => {
      it(`returns false when ${testDesc}`, () => {
        const event = new MouseEvent('mouseup', {clientX, clientY});
        const element = document.createElement('div');
        spyOn(element, 'getBoundingClientRect').and.returnValue(
          new DOMRect(100, 100, 100, 100)
        );

        const result = isMouseEventInElement(event, element);

        expect(result).toBeFalse();
      });
    });

    it('returns true when click is within element bounds', () => {
      const event = new MouseEvent('mouseup', {clientX: 150, clientY: 150});
      const element = document.createElement('div');
      spyOn(element, 'getBoundingClientRect').and.returnValue(
        new DOMRect(100, 100, 100, 100)
      );

      const result = isMouseEventInElement(event, element);

      expect(result).toBeTrue();
    });
  });
});
