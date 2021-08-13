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

import {RendererType} from '../renderer/renderer_types';
import {ScaleType} from '../scale_types';
import {compactDataSeries} from './compact_data_series';
import {HostToGuestEvent} from './message_types';
import {WorkerChart} from './worker_chart';

describe('line_chart_v2/lib/worker_chart test', () => {
  let workerPostMessageSpy: jasmine.Spy;
  let channelTxSpy: jasmine.Spy;
  let onDrawEndSpy: jasmine.Spy;
  let onContextLostSpy: jasmine.Spy;
  let chart: WorkerChart;

  beforeEach(() => {
    const messageChannel = new MessageChannel();
    channelTxSpy = spyOn(messageChannel.port1, 'postMessage');
    spyOn(messageChannel.port2, 'postMessage').and.throwError(
      'Should not call postMessage on port2'
    );

    spyOn(self, 'MessageChannel').and.returnValue(messageChannel);
    workerPostMessageSpy = jasmine.createSpy('WorkerPool#postMessage');
    spyOn(WorkerChart.workerPool, 'getNext').and.returnValue({
      activeCount: 0,
      postMessage: workerPostMessageSpy,
      free: () => {},
    });

    onDrawEndSpy = jasmine.createSpy();
    onContextLostSpy = jasmine.createSpy();
    chart = new WorkerChart({
      type: RendererType.WEBGL,
      devicePixelRatio: 1,
      callbacks: {onDrawEnd: onDrawEndSpy, onContextLost: onContextLostSpy},
      container: document.createElement('canvas'),
      domDimension: {width: 100, height: 200},
      useDarkMode: false,
    });
  });

  it('posts dark mode change messages', () => {
    chart.setUseDarkMode(false);
    expect(channelTxSpy).toHaveBeenCalledWith({
      type: HostToGuestEvent.DARK_MODE_UPDATED,
      useDarkMode: false,
    });

    chart.setUseDarkMode(true);
    expect(channelTxSpy).toHaveBeenCalledWith({
      type: HostToGuestEvent.DARK_MODE_UPDATED,
      useDarkMode: true,
    });
  });

  it('posts xScaleType message when setting xScaleType', () => {
    chart.setXScaleType(ScaleType.LOG10);

    expect(channelTxSpy).toHaveBeenCalledWith({
      type: HostToGuestEvent.SCALE_UPDATED,
      axis: 'x',
      scaleType: ScaleType.LOG10,
    });
  });

  it('posts yScaleType message when setting yScaleType', () => {
    chart.setYScaleType(ScaleType.LOG10);

    expect(channelTxSpy).toHaveBeenCalledWith({
      type: HostToGuestEvent.SCALE_UPDATED,
      axis: 'y',
      scaleType: ScaleType.LOG10,
    });
  });

  it('sends metadata', () => {
    chart.setMetadata({
      foo: {
        id: 'foo',
        displayName: 'Foo',
        visible: false,
        color: '#400',
      },
      bar: {
        id: 'bar',
        displayName: 'bar',
        visible: true,
        color: '#00f',
      },
    });

    expect(channelTxSpy).toHaveBeenCalledWith({
      type: HostToGuestEvent.SERIES_METADATA_CHANGED,
      metadata: {
        foo: {
          id: 'foo',
          displayName: 'Foo',
          visible: false,
          color: '#400',
        },
        bar: {
          id: 'bar',
          displayName: 'bar',
          visible: true,
          color: '#00f',
        },
      },
    });
  });

  it('sends data in a compact form', () => {
    const data = [
      {
        id: 'foo',
        points: [
          {x: 0, y: 0},
          {x: 1, y: 1},
        ],
      },
      {
        id: 'bar',
        points: [
          {x: 0, y: -100},
          {x: 100, y: 100},
          {x: 200, y: -100},
        ],
      },
    ];
    chart.setData(data);

    const compact = compactDataSeries(data);
    expect(channelTxSpy).toHaveBeenCalledWith(
      {
        type: HostToGuestEvent.SERIES_DATA_UPDATED,
        compactDataSeries: compact,
      },
      [compact.flattenedSeries]
    );
  });
});
