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

import {ChartImpl} from '../chart';
import {ChartOptions} from '../chart_types';
import {decompactDataSeries} from './compact_data_series';
import {
  GuestToMainType,
  HostToGuestEvent,
  HostToGuestMessage,
  InitMessage,
  RendererType,
} from './message_types';

self.addEventListener('message', (event: MessageEvent) => {
  createPortHandler(event.ports[0], event.data as InitMessage);
});

function createPortHandler(port: MessagePort, initMessage: InitMessage) {
  const {canvas, devicePixelRatio, dim, rendererType, useDarkMode} =
    initMessage;

  const lineChartCallbacks = {
    onDrawEnd: () => {
      port.postMessage({
        type: GuestToMainType.ON_REDRAW_END,
      });
    },
    onContextLost: () => {
      port.postMessage({
        type: GuestToMainType.ON_CONTEXT_LOST,
      });
    },
  };

  let chartOptions: ChartOptions;
  switch (rendererType) {
    case RendererType.WEBGL:
      chartOptions = {
        type: RendererType.WEBGL,
        domDimension: dim,
        callbacks: lineChartCallbacks,
        container: canvas,
        devicePixelRatio,
        useDarkMode,
      };
      break;
    default:
      throw new RangeError(
        `Invariant error: cannot have Offscreen chart for renderer type: ${rendererType}`
      );
  }

  const lineChart = new ChartImpl(chartOptions);

  port.onmessage = function (event: MessageEvent) {
    const message = event.data as HostToGuestMessage;

    switch (message.type) {
      case HostToGuestEvent.SERIES_DATA_UPDATED: {
        const data = decompactDataSeries(message.compactDataSeries);
        lineChart.setData(data);
        break;
      }
      case HostToGuestEvent.SERIES_METADATA_CHANGED: {
        lineChart.setMetadata(message.metadata);
        break;
      }
      case HostToGuestEvent.VIEW_BOX_UPDATED: {
        lineChart.setViewBox(message.extent);
        break;
      }
      case HostToGuestEvent.DOM_RESIZED: {
        lineChart.resize(message.dim);
        break;
      }
      case HostToGuestEvent.DARK_MODE_UPDATED: {
        lineChart.setUseDarkMode(message.useDarkMode);
        break;
      }
      case HostToGuestEvent.SCALE_UPDATED: {
        switch (message.axis) {
          case 'x':
            lineChart.setXScaleType(message.scaleType);
            break;
          case 'y':
            lineChart.setYScaleType(message.scaleType);
            break;
          default:
            const axis: never = message.axis;
            throw new RangeError(`Unknown axis: ${axis}`);
        }
        break;
      }
      case HostToGuestEvent.DISPOSED: {
        lineChart.dispose();
        break;
      }
    }
  };
}
