/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
import * as Plottable from 'plottable';
import {DragZoomLayer} from './dragZoomInteraction';

enum State {
  NONE,
  DRAG_ZOOMING,
  PANNING,
}
export type PanCallback = () => void;
export class PanZoomDragLayer extends Plottable.Components.Group {
  private panZoom: Plottable.Interactions.PanZoom;
  private dragZoomLayer: DragZoomLayer;
  private state: State = State.NONE;
  private panStartCallback = new Plottable.Utils.CallbackSet<PanCallback>();
  private panEndCallback = new Plottable.Utils.CallbackSet<PanCallback>();
  private _mouseDispatcher: Plottable.Dispatchers.Mouse | null;
  /**
   * A Plottable component/layer with a complex interaction for the line chart.
   * When not pressing alt-key, it behaves like DragZoomLayer -- dragging a
   * region zooms the area under the gray box and double clicking resets the
   * zoom. When pressing alt-key, it lets user pan around while having mousedown
   * on the chart and let user zoom-in/out of cursor when scroll with alt key
   * pressed.
   */
  constructor(
    xScale: Plottable.QuantitativeScale<
      | number
      | {
          valueOf(): number;
        }
    >,
    yScale: Plottable.QuantitativeScale<
      | number
      | {
          valueOf(): number;
        }
    >,
    unzoomMethod: Function
  ) {
    super();
    this.panZoom = new Plottable.Interactions.PanZoom(xScale, yScale);
    this.panZoom.dragInteraction().mouseFilter((event: MouseEvent) => {
      return PanZoomDragLayer.isPanKey(event) && event.button === 0;
    });
    this.panZoom.wheelFilter(this.canScrollZoom);
    this.dragZoomLayer = new DragZoomLayer(xScale, yScale, unzoomMethod);
    this.dragZoomLayer.dragInteraction().mouseFilter((event: MouseEvent) => {
      return !PanZoomDragLayer.isPanKey(event) && event.button === 0;
    });
    this.append(this.dragZoomLayer);
    const onWheel = this.onWheel.bind(this);
    this.onAnchor(() => {
      this._mouseDispatcher = Plottable.Dispatchers.Mouse.getDispatcher(this);
      this._mouseDispatcher.onWheel(onWheel);
      this.panZoom.attachTo(this);
    });
    this.onDetach(() => {
      this.panZoom.detachFrom(this);
      // onDetach can be invoked before onAnchor
      if (this._mouseDispatcher) {
        this._mouseDispatcher.offWheel(onWheel);
        this._mouseDispatcher = null;
      }
    });
    this.panZoom.dragInteraction().onDragStart(() => {
      if (this.state == State.NONE) this.setState(State.PANNING);
    });
    this.panZoom.dragInteraction().onDragEnd(() => {
      if (this.state == State.PANNING) this.setState(State.NONE);
    });
    this.dragZoomLayer.dragInteraction().onDragStart(() => {
      if (this.state == State.NONE) this.setState(State.DRAG_ZOOMING);
    });
    this.dragZoomLayer.dragInteraction().onDragEnd(() => {
      if (this.state == State.DRAG_ZOOMING) this.setState(State.NONE);
    });
  }
  private onWheel(_, event: WheelEvent) {
    if (this.canScrollZoom(event)) return;
    const helpContainer = this.element();
    if (!helpContainer.select('.help').empty()) return;
    const help = helpContainer.append('div').classed('help', true);
    help.append('span').text('Alt + Scroll to Zoom');
    // Please see vz-pan-zoom-style for the definition of the animation.
    help.on('animationend', () => void help.remove());
  }
  static isPanKey(event: MouseEvent): boolean {
    return Boolean(event.altKey) || Boolean(event.shiftKey);
  }
  private canScrollZoom(event: WheelEvent) {
    return event.altKey;
  }
  setState(nextState: State): void {
    if (this.state == nextState) return;
    const prevState = this.state;
    this.state = nextState;
    this.root().removeClass(this.stateClassName(prevState));
    this.root().addClass(this.stateClassName(nextState));
    if (prevState == State.PANNING) {
      this.panEndCallback.callCallbacks();
    }
    if (nextState == State.PANNING) {
      this.panStartCallback.callCallbacks();
    }
  }
  stateClassName(state: State): string {
    switch (state) {
      case State.PANNING:
        return 'panning';
      case State.DRAG_ZOOMING:
        return 'drag-zooming';
      case State.NONE:
      default:
        return '';
    }
  }
  onPanStart(cb: PanCallback) {
    this.panStartCallback.add(cb);
  }
  onPanEnd(cb: PanCallback) {
    this.panEndCallback.add(cb);
  }
  onScrollZoom(cb) {
    this.panZoom.onZoomEnd(cb);
  }
  onDragZoomStart(cb) {
    this.dragZoomLayer.interactionStart(cb);
  }
  onDragZoomEnd(cb) {
    this.dragZoomLayer.interactionEnd(cb);
  }
}
