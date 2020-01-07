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
The MIT License (MIT)

Copyright (c) 2014-2017 Palantir Technologies, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/**
 * Reason for the fork: Plottable interactions are not compatible with the Web
 * Componenets due to the changes in:
 * 1. how events work: i.e., parent components cannot introspect into DOM
 *    where an event originates from. Instead, they see originating
 *    WebComponents.
 * 2. DOM traversal: parentElement on shadowRoot is null.
 * Please refer to https://github.com/palantir/plottable/issues/3350 for more
 * detail.
 *
 * To override few quick private/protected methods, we had to use JavaScript to
 * bypass TypeScript typechecks.
 */
import * as Plottable from 'plottable';

// HACK: parentElement does not work for webcomponents.
function getHtmlElementAncestors(elem: Node | null) {
  const elems = [];
  while (elem && elem instanceof HTMLElement) {
    elems.push(elem);
    if (elem.assignedSlot) {
      elem = elem.assignedSlot;
    } else if (!elem.parentElement) {
      const parentNode = elem.parentNode;
      if (parentNode instanceof ShadowRoot) {
        elem = parentNode.host;
      } else {
        // <html>.parentNode == <html>
        elem = parentNode !== elem ? parentNode : null;
      }
    } else {
      elem = elem.parentElement;
    }
  }
  return elems;
}

const _IDENTITY_TRANSFORM: [number, number, number, number, number, number] = [
  1,
  0,
  0,
  1,
  0,
  0,
];

// Forked from https://github.com/palantir/plottable/blob/b6e36fbd4d8d7cba579d853b9f35cc260d1243bf/src/utils/mathUtils.ts#L173-L202
// The only difference is the implementation of the getHtmlElementAncestors.
function getCumulativeTransform(element: Element) {
  const elems = getHtmlElementAncestors(element);

  let transform = _IDENTITY_TRANSFORM;
  let offsetParent = null;
  for (const elem of elems) {
    // apply css transform from any ancestor element
    const elementTransform = Plottable.Utils.DOM.getElementTransform(elem);
    if (elementTransform != null) {
      const midX = elem.clientWidth / 2;
      const midY = elem.clientHeight / 2;
      transform = Plottable.Utils.Math.multiplyTranslate(transform, [
        midX,
        midY,
      ]);
      transform = Plottable.Utils.Math.multiplyMatrix(
        transform,
        Plottable.Utils.Math.invertMatrix(elementTransform)
      );
      transform = Plottable.Utils.Math.multiplyTranslate(transform, [
        -midX,
        -midY,
      ]);
    }

    // apply scroll offsets from any ancestor element
    let offsetX = elem.scrollLeft;
    let offsetY = elem.scrollTop;

    // apply client+offset from only acenstor "offsetParent"
    if (offsetParent === null || elem === offsetParent) {
      offsetX -= elem.offsetLeft + elem.clientLeft;
      offsetY -= elem.offsetTop + elem.clientTop;
      offsetParent = elem.offsetParent;
    }
    transform = Plottable.Utils.Math.multiplyTranslate(transform, [
      offsetX,
      offsetY,
    ]);
  }
  return transform;
}

class CustomTranslator extends Plottable.Utils.Translator {
  computePosition(clientX: number, clientY: number) {
    const clientPosition = {
      x: clientX,
      y: clientY,
    };

    const transform = getCumulativeTransform((this as any)._rootElement);
    if (transform == null) {
      return clientPosition;
    }

    const transformed = Plottable.Utils.Math.applyTransform(
      transform,
      clientPosition
    );
    return transformed;
  }
}

class MouseDispatcher extends (Plottable.Dispatchers.Mouse as any) {
  private constructor(component: Plottable.Component) {
    super(component);

    // eventTarget is `document` by default. Change it to the root of chart.
    this._eventTarget = component
      .root()
      .rootElement()
      .node();

    // Requires custom translator that uses correct DOM traversal (with
    // WebComponents) to change pointer position to relative to the root node.
    (this as any)._translator = new CustomTranslator(component
      .root()
      .rootElement()
      .node() as HTMLElement);
  }

  static getDispatcher(component: Plottable.Component) {
    const key = (MouseDispatcher as any)._DISPATCHER_KEY;
    const element = component.root().rootElement() as any;
    let dispatcher = element[key];

    if (!dispatcher || !(dispatcher instanceof MouseDispatcher)) {
      dispatcher = new MouseDispatcher(component);
      element[key] = dispatcher;
    }
    return dispatcher;
  }
}

class TouchDispatcher extends (Plottable.Dispatchers.Touch as any) {
  constructor(component: Plottable.Component) {
    super(component);
    const hackyThis = this as any;

    // eventTarget is `document` by default. Change it to the root of chart.
    hackyThis._eventTarget = component
      .root()
      .rootElement()
      .node();

    // Requires custom translator that uses correct DOM traversal (with
    // WebComponents) to change pointer position to relative to the root node.
    (this as any)._translator = new CustomTranslator(component
      .root()
      .rootElement()
      .node() as HTMLElement);
  }

  static getDispatcher(component: Plottable.Component) {
    const element = component.root().rootElement();
    let dispatcher = (element as any)[
      TouchDispatcher._DISPATCHER_KEY
    ] as TouchDispatcher;

    if (!dispatcher || !(dispatcher instanceof TouchDispatcher)) {
      dispatcher = new TouchDispatcher(component);
      (element as any)[TouchDispatcher._DISPATCHER_KEY] = dispatcher;
    }
    return dispatcher;
  }
}

export class PointerInteraction extends Plottable.Interactions.Pointer {
  static preallocateTbDispatcher(component: Plottable.Component) {
    // Assign, if not created already, our custom Dispatchers that understands
    // shadow DOM onto the cache so future interactions can use our patched version.
    MouseDispatcher.getDispatcher(component);
    TouchDispatcher.getDispatcher(component);
  }

  _anchor(component: Plottable.Component) {
    const hackyThis = this as any;
    hackyThis._isAnchored = true;
    hackyThis._mouseDispatcher = MouseDispatcher.getDispatcher(
      this._componentAttachedTo
    );
    hackyThis._mouseDispatcher.onMouseMove(hackyThis._mouseMoveCallback);

    hackyThis._touchDispatcher = TouchDispatcher.getDispatcher(
      this._componentAttachedTo
    );
    hackyThis._touchDispatcher.onTouchStart(hackyThis._touchStartCallback);
  }
}
