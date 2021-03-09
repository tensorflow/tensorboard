/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import * as tb_debug from '../../../components/tb_debug';
import * as tf_graph_loader from './loader';
import * as tf_graph_parser from './parser';

describe('graph tests', () => {
  let mockTracker: jasmine.SpyObj<any>;

  beforeEach(async () => {
    mockTracker = jasmine.createSpyObj('mockTracker', [
      'setMessage',
      'updateProgress',
      'reportError',
    ]);
  });

  it('notifies listeners of events when graph loads', async () => {
    // Use mock data instead of fetching from a file. This may skip parser
    // related events.
    spyOn(tf_graph_parser, 'fetchAndParseGraphData').and.returnValue(
      Promise.resolve({
        node: [{name: 'add1', input: [], device: '', op: 'add', attr: []}],
        versions: [],
        library: {function: []},
      })
    );

    const debugListenerSpy = spyOn(tb_debug, 'notifyActionEventFromPolymer');
    const {
      graphHierarchy,
    } = await tf_graph_loader.fetchAndConstructHierarchicalGraph(
      mockTracker,
      null /* remotePath */,
      null /* pbTxtFile */
    );

    const firstArgs = debugListenerSpy.calls
      .allArgs()
      .map((args: any[]) => args[0]);
    expect(firstArgs).toEqual([
      {
        eventCategory: tb_debug.GRAPH_DEBUG_TIMING_EVENT_CATEGORY,
        eventAction: tb_debug.GraphDebugEventId.NORMALIZING_NAMES,
        eventValue: jasmine.any(Number),
      },
      {
        eventCategory: tb_debug.GRAPH_DEBUG_TIMING_EVENT_CATEGORY,
        eventAction: tb_debug.GraphDebugEventId.BUILD_SLIM_GRAPH,
        eventValue: jasmine.any(Number),
      },
      {
        eventCategory: tb_debug.GRAPH_DEBUG_TIMING_EVENT_CATEGORY,
        eventAction: tb_debug.GraphDebugEventId.HIERARCHY_ADD_NODES,
        eventValue: jasmine.any(Number),
      },
      {
        eventCategory: tb_debug.GRAPH_DEBUG_TIMING_EVENT_CATEGORY,
        eventAction: tb_debug.GraphDebugEventId.HIERARCHY_DETECT_SERIES,
        eventValue: jasmine.any(Number),
      },
      {
        eventCategory: tb_debug.GRAPH_DEBUG_TIMING_EVENT_CATEGORY,
        eventAction: tb_debug.GraphDebugEventId.HIERARCHY_ADD_EDGES,
        eventValue: jasmine.any(Number),
      },
      {
        eventCategory: tb_debug.GRAPH_DEBUG_TIMING_EVENT_CATEGORY,
        eventAction: tb_debug.GraphDebugEventId.GRAPH_LOAD_SUCCEEDED,
        eventValue: jasmine.any(Number),
      },
    ]);
    const callCountAfterLoader = debugListenerSpy.calls.count();

    // Computing templates is done lazily.
    graphHierarchy.updateTemplates();

    expect(debugListenerSpy.calls.count()).toBe(callCountAfterLoader + 1);
    expect(debugListenerSpy.calls.mostRecent().args[0]).toEqual({
      eventCategory: tb_debug.GRAPH_DEBUG_TIMING_EVENT_CATEGORY,
      eventAction: tb_debug.GraphDebugEventId.HIERARCHY_FIND_SIMILAR_SUBGRAPHS,
      eventValue: jasmine.any(Number),
    });
  });

  it('notifies listeners of events when graph fails to load', async () => {
    // Use mock data instead of fetching from a file. This may skip parser
    // related events.
    spyOn(tf_graph_parser, 'fetchAndParseGraphData').and.returnValue(
      Promise.resolve({
        // Graphs with no 'node' objects are invalid.
        node: undefined,
        versions: [],
        library: {function: []},
      })
    );

    const debugListenerSpy = spyOn(tb_debug, 'notifyActionEventFromPolymer');

    const loadPromise = tf_graph_loader.fetchAndConstructHierarchicalGraph(
      mockTracker,
      null /* remotePath */,
      null /* pbTxtFile */
    );
    await expectAsync(loadPromise).toBeRejected();

    const firstArgs = debugListenerSpy.calls
      .allArgs()
      .map((args: any[]) => args[0]);
    expect(firstArgs).toEqual([
      {
        eventCategory: tb_debug.GRAPH_DEBUG_TIMING_EVENT_CATEGORY,
        eventAction: tb_debug.GraphDebugEventId.GRAPH_LOAD_FAILED,
        eventValue: jasmine.any(Number),
      },
    ]);
  });
});
