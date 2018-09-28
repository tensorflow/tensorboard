/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
namespace vz_line_chart {

export type EventFilter = (e: UIEvent) => boolean;

/**
 * Forked from https://github.com/palantir/plottable/blob/v3.7.0/src/interactions/dragInteraction.ts
 * https://github.com/palantir/plottable/issues/3479
 *
 * Changes:
 * - Renamed MouseFilter to eventFilter
 * - Applied the eventFilter to all events including TouchEvents, not just the
 *   mouseEvents.
 */
export class Drag extends Plottable.Interaction {
  private static _DEFAULT_MOUSE_FILTER = (event: MouseEvent) => event.button === 0;

  private _dragging = false;
  private _constrainedToComponent = true;
  private _mouseDispatcher: Plottable.Dispatchers.Mouse;
  /**
   * Only emit events when the eventFilter is true for the source mouse
   * events. Use this to define custom filters (e.g. only right click,
   * require shift to be held down, etc.)
   */
  private _eventFilter: EventFilter = Drag._DEFAULT_MOUSE_FILTER;
  private _touchDispatcher: Plottable.Dispatchers.Touch;
  private _dragOrigin: Plottable.Point;
  private _dragStartCallbacks = new Plottable.Utils.CallbackSet<Plottable.DragCallback>();
  private _dragCallbacks = new Plottable.Utils.CallbackSet<Plottable.DragCallback>();
  private _dragEndCallbacks = new Plottable.Utils.CallbackSet<Plottable.DragCallback>();

  private _mouseDownCallback = (p: Plottable.Point, e: MouseEvent) => this._startDrag(p, e);
  private _mouseMoveCallback = (p: Plottable.Point, e: MouseEvent) => this._doDrag(p, e);
  private _mouseUpCallback = (p: Plottable.Point, e: MouseEvent) => this._endDrag(p, e);
  private _touchStartCallback = (ids: number[], idToPoint: Plottable.Point[], e: UIEvent) => this._startDrag(idToPoint[ids[0]], e);
  private _touchMoveCallback = (ids: number[], idToPoint: Plottable.Point[], e: UIEvent) => this._doDrag(idToPoint[ids[0]], e);
  private _touchEndCallback = (ids: number[], idToPoint: Plottable.Point[], e: UIEvent) => this._endDrag(idToPoint[ids[0]], e);

  protected _anchor(component: Plottable.Component) {
    super._anchor(component);
    this._mouseDispatcher = Plottable.Dispatchers.Mouse.getDispatcher(this._componentAttachedTo);
    this._mouseDispatcher.onMouseDown(this._mouseDownCallback);
    this._mouseDispatcher.onMouseMove(this._mouseMoveCallback);
    this._mouseDispatcher.onMouseUp(this._mouseUpCallback);

    this._touchDispatcher = Plottable.Dispatchers.Touch.getDispatcher(this._componentAttachedTo);
    this._touchDispatcher.onTouchStart(this._touchStartCallback);
    this._touchDispatcher.onTouchMove(this._touchMoveCallback);
    this._touchDispatcher.onTouchEnd(this._touchEndCallback);
  }

  protected _unanchor() {
    super._unanchor();
    this._mouseDispatcher.offMouseDown(this._mouseDownCallback);
    this._mouseDispatcher.offMouseMove(this._mouseMoveCallback);
    this._mouseDispatcher.offMouseUp(this._mouseUpCallback);
    this._mouseDispatcher = null;

    this._touchDispatcher.offTouchStart(this._touchStartCallback);
    this._touchDispatcher.offTouchMove(this._touchMoveCallback);
    this._touchDispatcher.offTouchEnd(this._touchEndCallback);
    this._touchDispatcher = null;
  }

  private _translateAndConstrain(p: Plottable.Point) {
    const translatedP = this._translateToComponentSpace(p);
    if (!this._constrainedToComponent) {
      return translatedP;
    }

    return {
      x: Plottable.Utils.Math.clamp(translatedP.x, 0, this._componentAttachedTo.width()),
      y: Plottable.Utils.Math.clamp(translatedP.y, 0, this._componentAttachedTo.height()),
    };
  }

  private _startDrag(point: Plottable.Point, event: UIEvent) {
    if (!this._eventFilter(event)) return;
    const translatedP = this._translateToComponentSpace(point);
    if (this._isInsideComponent(translatedP)) {
      event.preventDefault();
      this._dragging = true;
      this._dragOrigin = translatedP;
      this._dragStartCallbacks.callCallbacks(this._dragOrigin);
    }
  }

  private _doDrag(point: Plottable.Point, event: UIEvent) {
    if (this._dragging) {
      this._dragCallbacks.callCallbacks(this._dragOrigin, this._translateAndConstrain(point));
    }
  }

  private _endDrag(point: Plottable.Point, event: UIEvent) {
    if (event instanceof MouseEvent && (<MouseEvent> event).button !== 0) {
      return;
    }
    if (this._dragging) {
      this._dragging = false;
      this._dragEndCallbacks.callCallbacks(this._dragOrigin, this._translateAndConstrain(point));
    }
  }

  /**
   * Gets whether the Drag Interaction constrains Points passed to its
   * callbacks to lie inside its Component.
   *
   * If true, when the user drags outside of the Component, the closest Point
   * inside the Component will be passed to the callback instead of the actual
   * cursor position.
   *
   * @return {boolean}
   */
  public constrainedToComponent(): boolean;
  /**
   * Sets whether the Drag Interaction constrains Points passed to its
   * callbacks to lie inside its Component.
   *
   * If true, when the user drags outside of the Component, the closest Point
   * inside the Component will be passed to the callback instead of the actual
   * cursor position.
   *
   * @param {boolean}
   * @return {Drag} The calling Drag Interaction.
   */
  public constrainedToComponent(constrainedToComponent: boolean): this;
  public constrainedToComponent(constrainedToComponent?: boolean): any {
    if (constrainedToComponent == null) {
      return this._constrainedToComponent;
    }
    this._constrainedToComponent = constrainedToComponent;
    return this;
  }

  /**
   * Gets the current Mouse Filter. Plottable implements a default Mouse Filter
   * to only Drag on a primary (left) click.
   * @returns {EventFilter}
   */
  public eventFilter(): EventFilter;
  /**
   * Set the current Mouse Filter. DragInteraction will only emit events when
   * the eventFilter evaluates to true for the source mouse events. Use this
   * to define custom filters (e.g. only right click, requires shift to be
   * held down, etc.)
   *
   * @param {EventFilter} filter
   * @returns {this}
   */
  public eventFilter(filter: EventFilter): this;
  public eventFilter(filter?: EventFilter): any {
    if (arguments.length === 0) {
      return this._eventFilter;
    }
    this._eventFilter = filter;
    return this;
  }

  /**
   * Adds a callback to be called when dragging starts.
   *
   * @param {Plottable.DragCallback} callback
   * @returns {Drag} The calling Drag Interaction.
   */
  public onDragStart(callback: Plottable.DragCallback) {
    this._dragStartCallbacks.add(callback);
    return this;
  }

  /**
   * Removes a callback that would be called when dragging starts.
   *
   * @param {Plottable.DragCallback} callback
   * @returns {Drag} The calling Drag Interaction.
   */
  public offDragStart(callback: Plottable.DragCallback) {
    this._dragStartCallbacks.delete(callback);
    return this;
  }

  /**
   * Adds a callback to be called during dragging.
   *
   * @param {Plottable.DragCallback} callback
   * @returns {Drag} The calling Drag Interaction.
   */
  public onDrag(callback: Plottable.DragCallback) {
    this._dragCallbacks.add(callback);
    return this;
  }

  /**
   * Removes a callback that would be called during dragging.
   *
   * @param {Plottable.DragCallback} callback
   * @returns {Drag} The calling Drag Interaction.
   */
  public offDrag(callback: Plottable.DragCallback) {
    this._dragCallbacks.delete(callback);
    return this;
  }

  /**
   * Adds a callback to be called when dragging ends.
   *
   * @param {Plottable.DragCallback} callback
   * @returns {Drag} The calling Drag Interaction.
   */
  public onDragEnd(callback: Plottable.DragCallback) {
    this._dragEndCallbacks.add(callback);
    return this;
  }

  /**
   * Removes a callback that would be called when dragging ends.
   *
   * @param {Plottable.DragCallback} callback
   * @returns {Drag} The calling Drag Interaction.
   */
  public offDragEnd(callback: Plottable.DragCallback) {
    this._dragEndCallbacks.delete(callback);
    return this;
  }

}

}  // namespace vz_line_chart
