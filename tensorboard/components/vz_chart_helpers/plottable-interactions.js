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
var vz_chart_helpers;
(function(vz_chart_helpers) {
  // HACK: parentElement does not work for webcomponents.
  function getHtmlElementAncestors(elem) {
    const elems = [];
    while (elem && elem instanceof HTMLElement) {
      elems.push(elem);
      if (elem.assignedSlot) {
        elem = elem.assignedSlot;
      } else if (!elem.parentElement) {
        const parentNode = elem.parentNode;
        if (parentNode instanceof DocumentFragment) {
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

  const _IDENTITY_TRANSFORM = [1, 0, 0, 1, 0, 0];

  // Forked from https://github.com/palantir/plottable/blob/b6e36fbd4d8d7cba579d853b9f35cc260d1243bf/src/utils/mathUtils.ts#L173-L202
  // The only difference is the implementation of the getHtmlElementAncestors.
  function getCumulativeTransform(element) {
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
    computePosition(clientX, clientY) {
      const clientPosition = {
        x: clientX,
        y: clientY,
      };

      const transform = getCumulativeTransform(this._rootElement);
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

  class MouseDispatcher extends Plottable.Dispatchers.Mouse {
    constructor(component) {
      super(component);
      // eventTarget is `document` by default. Change it to the root of chart.
      this._eventTarget = component
        .root()
        .rootElement()
        .node();
      // Requires custom translator that uses correct DOM traversal (with
      // WebComponents) to change pointer position to relative to the root node.
      this._translator = new CustomTranslator(
        component
          .root()
          .rootElement()
          .node()
      );
    }

    static getDispatcher(component) {
      const element = component.root().rootElement();
      let dispatcher = element[MouseDispatcher._DISPATCHER_KEY];

      if (!dispatcher) {
        dispatcher = new MouseDispatcher(component);
        element[MouseDispatcher._DISPATCHER_KEY] = dispatcher;
      }
      return dispatcher;
    }
  }

  class TouchDispatcher extends Plottable.Dispatchers.Touch {
    constructor(component) {
      super(component);
      // eventTarget is `document` by default. Change it to the root of chart.
      this._eventTarget = component
        .root()
        .rootElement()
        .node();
      // Requires custom translator that uses correct DOM traversal (with
      // WebComponents) to change pointer position to relative to the root node.
      this._translator = new CustomTranslator(
        component
          .root()
          .rootElement()
          .node()
      );
    }

    static getDispatcher(component) {
      const element = component.root().rootElement();
      let dispatcher = element[TouchDispatcher._DISPATCHER_KEY];

      if (!dispatcher) {
        dispatcher = new TouchDispatcher(component);
        element[TouchDispatcher._DISPATCHER_KEY] = dispatcher;
      }
      return dispatcher;
    }
  }

  class PointerInteraction extends Plottable.Interactions.Pointer {
    _anchor(component) {
      this._isAnchored = true;
      this._mouseDispatcher = MouseDispatcher.getDispatcher(
        this._componentAttachedTo
      );
      this._mouseDispatcher.onMouseMove(this._mouseMoveCallback);

      this._touchDispatcher = TouchDispatcher.getDispatcher(
        this._componentAttachedTo
      );
      this._touchDispatcher.onTouchStart(this._touchStartCallback);
    }
  }

  // export only PointerInteraction.
  vz_chart_helpers.PointerInteraction = PointerInteraction;
})(vz_chart_helpers || (vz_chart_helpers = {}));
