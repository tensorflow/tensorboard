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

import {Chart} from '../chart';
import {ChartOption} from '../chart_types';
import {DataSeries} from '../internal_types';
import {
  GuestToMainType,
  InitMessage,
  MainToGuestEvent,
  MainToGuestMessage,
  RendererType,
} from './worker_chart_types';

self.addEventListener('message', (event: MessageEvent) => {
  createPortHandler(event.ports[0], event.data as InitMessage);
});

function createPortHandler(port: MessagePort, initMessage: InitMessage) {
  const {
    canvas,
    devicePixelRatio,
    dim,
    rendererType,
    xScaleType,
    yScaleType,
  } = initMessage;

  const lineChartCallbacks = {
    onDrawEnd: () => {
      port.postMessage({
        type: GuestToMainType.ON_REDRAW_END,
      });
    },
  };

  let chartOption: ChartOption;
  switch (rendererType) {
    case RendererType.WEBGL:
      chartOption = {
        readAndUpdateDomDimensions: RendererType.WEBGL,
        domDimension: dim,
        callbacks: lineChartCallbacks,
        container: canvas,
        devicePixelRatio,
        xScaleType,
        yScaleType,
      };
      break;
    default:
      throw new RangeError(
        `Invariant error: cannot have Offscreen chart for renderer type: ${rendererType}`
      );
  }

  const lineChart = new Chart(chartOption);

  port.onmessage = function (event: MessageEvent) {
    const message = event.data as MainToGuestMessage;

    switch (message.type) {
      case MainToGuestEvent.SERIES_DATA_UPDATE: {
        const rawData = new Float32Array(message.flattenedSeries);
        const data: DataSeries[] = [];
        let rawDataIndex = 0;

        for (const {id, length} of message.idsAndLengths) {
          const points = [] as Array<{x: number; y: number}>;
          for (let index = 0; index < length; index++) {
            points.push({
              x: rawData[rawDataIndex++],
              y: rawData[rawDataIndex++],
            });
          }
          data.push({
            id,
            points,
          });
        }

        lineChart.updateData(data);
        break;
      }
      case MainToGuestEvent.SERIES_METADATA_CHANGED: {
        lineChart.updateMetadata(message.metadata);
        break;
      }
      case MainToGuestEvent.SERIES_DATA_UPDATE: {
        break;
      }
      case MainToGuestEvent.UPDATE_VIEW_BOX: {
        lineChart.updateViewBox(message.extent);
        break;
      }
      case MainToGuestEvent.RESIZE: {
        lineChart.resize(message.dim);
        break;
      }
      case MainToGuestEvent.SCALE_UPDATE: {
        switch (message.axis) {
          case 'x':
            lineChart.setXScaleType(message.scaleType);
            break;
          case 'y':
            lineChart.setYScaleType(message.scaleType);
            break;
          default:
            const _: never = message.axis;
            throw new RangeError(`Unknown axis: ${_}`);
        }
        break;
      }
    }
  };
}
