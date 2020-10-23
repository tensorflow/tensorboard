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

import {Chart, ChartCallbacks, ChartOption} from '../chart_types';
import {
  DataSeries,
  DataSeriesMetadataMap,
  Dimension,
  Extent,
  ScaleType,
} from '../internal_types';
import {
  GuestToMainMessage,
  GuestToMainType,
  InitMessage,
  MainToGuestEvent,
  MainToGuestMessage,
  RendererType,
} from './worker_chart_types';
import {compactDataSeries} from './worker_chart_utils';
import {WorkerPool, WorkerProxy} from './worker_pool';

export class WorkerChart implements Chart {
  private readonly txMessagePort: MessagePort;
  private readonly callbacks: ChartCallbacks;
  private readonly workerInstance: WorkerProxy;

  static readonly workerPool = new WorkerPool('chart_worker.js');

  constructor(option: ChartOption) {
    this.callbacks = option.callbacks;

    if (option.type === RendererType.SVG) {
      throw new RangeError('Cannot use SVG for the offscreen line chart.');
    }

    const channel = new MessageChannel();
    channel.port1.onmessage = (message) => {
      this.onMessageFromWorker(message.data as GuestToMainMessage);
    };

    this.txMessagePort = channel.port1;

    const canvas = (option.container as HTMLCanvasElement).transferControlToOffscreen();

    this.workerInstance = WorkerChart.workerPool.getNext();

    const initMessage: InitMessage = {
      type: MainToGuestEvent.INIT,
      canvas,
      devicePixelRatio: window.devicePixelRatio,
      dim: option.domDimension,
      rendererType: option.type,
    };

    this.workerInstance.postMessage(initMessage, [canvas, channel.port2]);
  }

  dispose() {
    this.workerInstance.free();
    this.txMessagePort.close();
  }

  setXScaleType(type: ScaleType) {
    this.sendMessage({
      type: MainToGuestEvent.SCALE_UPDATE,
      axis: 'x',
      scaleType: type,
    });
  }

  setYScaleType(type: ScaleType) {
    this.sendMessage({
      type: MainToGuestEvent.SCALE_UPDATE,
      axis: 'y',
      scaleType: type,
    });
  }

  resize(dim: Dimension) {
    this.sendMessage({type: MainToGuestEvent.RESIZE, dim});
  }

  setMetadata(metadataMap: DataSeriesMetadataMap): void {
    this.sendMessage({
      type: MainToGuestEvent.SERIES_METADATA_CHANGED,
      metadata: metadataMap,
    });
  }

  setViewBox(extent: Extent): void {
    this.sendMessage({type: MainToGuestEvent.UPDATE_VIEW_BOX, extent});
  }

  setData(data: DataSeries[]): void {
    const {idsAndLengths, flattenedSeries} = compactDataSeries(data);
    this.sendMessage(
      {
        type: MainToGuestEvent.SERIES_DATA_UPDATE,
        idsAndLengths,
        flattenedSeries,
      },
      // Need to transfer the ownership to the worker.
      [flattenedSeries]
    );
  }

  private sendMessage(
    message: Exclude<MainToGuestMessage, InitMessage>,
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
      }
    }
  }
}
