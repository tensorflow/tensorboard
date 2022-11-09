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
// License of the forked code is covered by one in
// tensorboard/components/tf_imports/plottable.html.
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

function getHtmlElementAncestors(element: Node) {
  const elems: HTMLElement[] = [];
  let elem: Node | null = element;
  while (elem && elem instanceof HTMLElement) {
    elems.push(elem);
    if (elem.assignedSlot) {
      elem = elem.assignedSlot;
    } else if (!elem.parentElement) {
      const parentNode = elem.parentNode;
      if (parentNode instanceof DocumentFragment) {
        elem = (parentNode as ShadowRoot).host;
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
  const elems: HTMLElement[] = getHtmlElementAncestors(element);
  let transform: number[] = _IDENTITY_TRANSFORM;
  let offsetParent: Element | null = null;
  for (const elem of elems) {
    // apply css transform from any ancestor element
    const elementTransform = Plottable.Utils.DOM.getElementTransform(elem);
    if (elementTransform != null) {
      const midX = elem.clientWidth / 2;
      const midY = elem.clientHeight / 2;
      transform = Plottable.Utils.Math.multiplyTranslate(transform as any, [
        midX,
        midY,
      ]);
      transform = Plottable.Utils.Math.multiplyMatrix(
        transform as any,
        Plottable.Utils.Math.invertMatrix(elementTransform)
      );
      transform = Plottable.Utils.Math.multiplyTranslate(transform as any, [
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
    transform = Plottable.Utils.Math.multiplyTranslate(transform as any, [
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
    const transform = getCumulativeTransform((this as any)._rootElement);
    if (transform == null) {
      return clientPosition;
    }
    const transformed = Plottable.Utils.Math.applyTransform(
      transform as any,
      clientPosition
    );
    return transformed;
  }
}

class MouseDispatcher extends (Plottable.Dispatchers as any).Mouse {
  constructor(component) {
    super(component);
    // eventTarget is `document` by default. Change it to the root of chart.
    this._eventTarget = component.root().rootElement().node();
    // Requires custom translator that uses correct DOM traversal (with
    // WebComponents) to change pointer position to relative to the root node.
    (this as any)._translator = new CustomTranslator(
      component.root().rootElement().node()
    );
  }
  static getDispatcher(component) {
    const element = component.root().rootElement();
    let dispatcher = element[(MouseDispatcher as any)._DISPATCHER_KEY];
    if (!dispatcher) {
      dispatcher = new MouseDispatcher(component);
      element[(MouseDispatcher as any)._DISPATCHER_KEY] = dispatcher;
    }
    return dispatcher;
  }
}

class TouchDispatcher extends Plottable.Dispatchers.Touch {
  constructor(component) {
    super(component);
    // eventTarget is `document` by default. Change it to the root of chart.
    this._eventTarget = component.root().rootElement().node();
    // Requires custom translator that uses correct DOM traversal (with
    // WebComponents) to change pointer position to relative to the root node.
    (this as any)._translator = new CustomTranslator(
      component.root().rootElement().node()
    );
  }
  static override getDispatcher(component) {
    const element = component.root().rootElement();
    let dispatcher = element[(TouchDispatcher as any)._DISPATCHER_KEY];
    if (!dispatcher) {
      dispatcher = new TouchDispatcher(component);
      element[(TouchDispatcher as any)._DISPATCHER_KEY] = dispatcher;
    }
    return dispatcher;
  }
}

/**
 * Fixes #3282.
 *
 * Repro: when tooltip is shown, slowly move the mouse to an edge of a chart.
 * We expect the tooltip the disappear when the cursor is on the edge of the
 * chart.
 *
 * Cause:
 * 1. For Polymer 2 and its Shadow DOM compatibility, TensorBoard opted out of
 * the event delegation of Plottable. Plottable, by default, attaches a set of
 * event listeners on document.body and invokes appropriate callbacks
 * depending on the circumstances. However, with the Shadow DOM, the event
 * re-targetting broke (harder to identify `event.target`), so TensorBoard,
 * instead, attaches the event listeners on every Plottable container, SVGs.
 *
 * 2. When mouse leaves (mouseout) the container, Plottable remaps the event
 * as mouse move and calculate whether the cursor is inside a component
 * (Interaction.prototype._isInsideComponent, specifically) to trigger
 * appropriate callback. The method, however is flawed since it returns, for a
 * component that is, for instance, at <0, 0> with size of <100, 100>, true
 * when pointer is at <100, 100>. It should only return true for [0, 100) for
 * a given dimension, instead.  As a result, the mouseout event occurred at
 * <100, 100> was treated as an event inside the component but all the
 * subsequent mouse movements are not captured since they are events that
 * occurred outside of the event target. In vanilla Plottable, this bug do not
 * manifest since event delegation on the entire document will eventually
 * trigger mouse out when cursor is at, for instance, <101, 100>.
 */
(Plottable.Interaction.prototype as any)._isInsideComponent = function (p) {
  return (
    0 <= p.x &&
    0 <= p.y &&
    // Delta: `<` instead of `<=` here and below.
    p.x < this._componentAttachedTo.width() &&
    p.y < this._componentAttachedTo.height()
  );
};

export class PointerInteraction extends Plottable.Interactions.Pointer {
  override _anchor(component) {
    const anyThis = this as any;
    anyThis._isAnchored = true;
    anyThis._mouseDispatcher = MouseDispatcher.getDispatcher(
      anyThis._componentAttachedTo
    );
    anyThis._mouseDispatcher.onMouseMove(anyThis._mouseMoveCallback);
    anyThis._touchDispatcher = TouchDispatcher.getDispatcher(
      anyThis._componentAttachedTo
    );
    anyThis._touchDispatcher.onTouchStart(anyThis._touchStartCallback);
  }
}
