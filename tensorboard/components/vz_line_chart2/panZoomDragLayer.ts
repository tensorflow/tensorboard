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
namespace vz_line_chart2 {

export class PanZoomDragLayer extends Plottable.Components.Group {
  private panZoom: Plottable.Interactions.PanZoom;
  private dragZoomLayer: vz_line_chart.DragZoomLayer;

  /**
   * A Plottable component/layer with a complex interaction for the line chart.
   * When not pressing alt-key, it behaves like DragZoomLayer -- dragging a
   * region zooms the area under the gray box and double clicking resets the
   * zoom. When pressing alt-key, it lets user pan around while having mousedown
   * on the chart and let user zoom-in/out of cursor when scroll.
   */
  constructor(
      xScale: Plottable.QuantitativeScale<number|{valueOf(): number}>,
      yScale: Plottable.QuantitativeScale<number|{valueOf(): number}>,
      unzoomMethod: Function) {
    super();

    this.panZoom = new Plottable.Interactions.PanZoom(xScale, yScale);
    this.panZoom.dragInteraction().mouseFilter((event: MouseEvent) => {
      return Boolean(event.altKey) && event.button === 0;
    });
    this.panZoom.attachTo(this);

    this.dragZoomLayer = new vz_line_chart.DragZoomLayer(
        xScale,
        yScale,
        unzoomMethod);
    this.dragZoomLayer.dragInteraction().mouseFilter((event: MouseEvent) => {
      return !Boolean(event.altKey) && event.button === 0;
    });
    this.append(this.dragZoomLayer);

    this.onAnchor(() => {
      this.panZoom.attachTo(this);
    });
    this.onDetach(() => {
      this.panZoom.detachFrom(this);
    });
  }

  onDragStart(cb) {
    this.dragZoomLayer.dragInteraction().onDragStart(cb);
    this.dragZoomLayer.interactionStart(cb);
  }

  onDragEnd(cb) {
    this.dragZoomLayer.dragInteraction().onDragEnd(cb);
    this.dragZoomLayer.interactionEnd(cb);
  }
}

}  // namespace vz_line_chart
