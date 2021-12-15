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

import {Chart, ChartCallbacks, ChartOptions} from '../chart_types';
import {
  DataSeries,
  DataSeriesMetadataMap,
  Dimension,
  Extent,
  ScaleType,
} from '../internal_types';
import {compactDataSeries} from './compact_data_series';
import {
  GuestToMainMessage,
  GuestToMainType,
  HostToGuestEvent,
  HostToGuestMessage,
  InitMessage,
  RendererType,
} from './message_types';
import {WorkerPool, WorkerProxy} from './worker_pool';
import {RES_PATH} from './worker_resource';

export class WorkerChart implements Chart {
  private readonly txMessagePort: MessagePort;
  private readonly callbacks: ChartCallbacks;
  private readonly workerInstance: WorkerProxy;

  static readonly workerPool = new WorkerPool(RES_PATH);

  constructor(options: ChartOptions) {
    this.callbacks = options.callbacks;

    if (options.type !== RendererType.WEBGL) {
      throw new RangeError(
        `Cannot use non WEBGL renderer for the offscreen line chart. Received ${
          RendererType[options.type]
        } `
      );
    }

    const channel = new MessageChannel();
    channel.port1.onmessage = (message) => {
      this.onMessageFromWorker(message.data as GuestToMainMessage);
    };

    this.txMessagePort = channel.port1;

    const canvas = (
      options.container as HTMLCanvasElement
    ).transferControlToOffscreen();

    this.workerInstance = WorkerChart.workerPool.getNext();

    const initMessage: InitMessage = {
      type: HostToGuestEvent.INIT,
      canvas,
      devicePixelRatio: window.devicePixelRatio,
      dim: options.domDimension,
      rendererType: options.type,
      useDarkMode: options.useDarkMode,
    };

    this.workerInstance.postMessage(initMessage, [
      canvas,
      channel.port2,
    ] as Transferable[]);
  }

  dispose() {
    this.sendMessage({type: HostToGuestEvent.DISPOSED});
    this.workerInstance.free();
    this.txMessagePort.close();
  }

  setXScaleType(type: ScaleType) {
    this.sendMessage({
      type: HostToGuestEvent.SCALE_UPDATED,
      axis: 'x',
      scaleType: type,
    });
  }

  setYScaleType(type: ScaleType) {
    this.sendMessage({
      type: HostToGuestEvent.SCALE_UPDATED,
      axis: 'y',
      scaleType: type,
    });
  }

  resize(dim: Dimension) {
    this.sendMessage({type: HostToGuestEvent.DOM_RESIZED, dim});
  }

  setMetadata(metadataMap: DataSeriesMetadataMap): void {
    this.sendMessage({
      type: HostToGuestEvent.SERIES_METADATA_CHANGED,
      metadata: metadataMap,
    });
  }

  setViewBox(extent: Extent): void {
    this.sendMessage({type: HostToGuestEvent.VIEW_BOX_UPDATED, extent});
  }

  setData(data: DataSeries[]): void {
    const compactData = compactDataSeries(data);
    this.sendMessage(
      {
        type: HostToGuestEvent.SERIES_DATA_UPDATED,
        compactDataSeries: compactData,
      },
      // Need to transfer the ownership to the worker.
      [compactData.flattenedSeries]
    );
  }

  setUseDarkMode(useDarkMode: boolean): void {
    this.sendMessage({
      type: HostToGuestEvent.DARK_MODE_UPDATED,
      useDarkMode,
    });
  }

  private sendMessage(
    message: Exclude<HostToGuestMessage, InitMessage>,
    transfer?: Transferable[]
  ) {
    if (transfer) {
      this.txMessagePort.postMessage(message, transfer);
    } else {
      this.txMessagePort.postMessage(message);
    }
  }

  private onMessageFromWorker(message: GuestToMainMessage) {
    switch (message.type) {
      case GuestToMainType.ON_REDRAW_END: {
        this.callbacks.onDrawEnd();
        break;
      }
      case GuestToMainType.ON_CONTEXT_LOST: {
        this.callbacks.onContextLost();
        break;
      }
    }
  }
}
