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
import * as tf_graph_common from './common';
import * as tf_graph from './graph';
import * as tf_graph_hierarchy from './hierarchy';
import * as tf_graph_loader from './loader';
import * as tf_graph_parser from './parser';
import * as tf_graph_proto from './proto';

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
    const {graphHierarchy} =
      await tf_graph_loader.fetchAndConstructHierarchicalGraph(
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
      } as unknown as tf_graph_proto.GraphDef)
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

  describe('Graph Hierarchy', () => {
    it('does not mutate the provided seriesMap by reference', () => {
      const readonlySeriesMap = new Map([
        ['fooNode', tf_graph.SeriesGroupingType.UNGROUP],
        ['barNode', tf_graph.SeriesGroupingType.GROUP],
      ]);
      const params = {
        ...tf_graph_hierarchy.DefaultHierarchyParams,
        seriesMap: readonlySeriesMap,
      };

      const hierarchy = new tf_graph_hierarchy.Hierarchy(params);
      hierarchy.setSeriesGroupType(
        'barNode',
        tf_graph.SeriesGroupingType.UNGROUP
      );

      // The Hierarchy's map should update.
      expect(hierarchy.getSeriesGroupType('barNode')).toBe(
        tf_graph.SeriesGroupingType.UNGROUP
      );

      // The original map should not.
      expect(params.seriesMap.get('barNode')).toBe(
        tf_graph.SeriesGroupingType.GROUP
      );
    });

    it('builds a toggled seriesMap', () => {
      const hierarchy = new tf_graph_hierarchy.Hierarchy({
        ...tf_graph_hierarchy.DefaultHierarchyParams,
        seriesMap: new Map([
          ['fooNode', tf_graph.SeriesGroupingType.UNGROUP],
          ['barNode', tf_graph.SeriesGroupingType.GROUP],
        ]),
      });

      const result1 = hierarchy.buildSeriesGroupMapToggled('fooNode');
      expect(result1).toEqual(
        new Map([
          ['fooNode', tf_graph.SeriesGroupingType.GROUP],
          ['barNode', tf_graph.SeriesGroupingType.GROUP],
        ])
      );

      const result2 = hierarchy.buildSeriesGroupMapToggled('barNode');
      expect(result2).toEqual(
        new Map([
          ['fooNode', tf_graph.SeriesGroupingType.UNGROUP],
          ['barNode', tf_graph.SeriesGroupingType.UNGROUP],
        ])
      );

      const result3 = hierarchy.buildSeriesGroupMapToggled('unknownNode');
      expect(result3).toEqual(
        new Map([
          ['fooNode', tf_graph.SeriesGroupingType.UNGROUP],
          ['barNode', tf_graph.SeriesGroupingType.GROUP],
          ['unknownNode', tf_graph.SeriesGroupingType.UNGROUP],
        ])
      );
    });

    it('groups numeric series of nodes without underscores', async () => {
      const pbtxt = `
        node {
          name: "foo1"
          op: "Add"
        }
        node {
          name: "foo2"
          op: "Add"
        }
        node {
          name: "foo3"
          op: "Add"
        }
        node {
          name: "foo4"
          op: "Add"
        }
        node {
          name: "foo5"
          op: "Add"
        }
      `;
      const slimGraph = await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
      const hierarchy = await slimGraphToHierarchy(slimGraph);
      const nodeNames = Object.keys(hierarchy.getNodeMap()).sort();
      expect(nodeNames).toEqual([
        '__root__',
        'foo1',
        'foo2',
        'foo3',
        'foo4',
        'foo5',
        'foo[1-5]',
      ]);
      expect(hierarchy.getSeriesGroupType('foo[1-5]')).toBe(
        tf_graph.SeriesGroupingType.GROUP
      );
    });

    it('groups numeric series of nodes with underscores', async () => {
      const pbtxt = `
        node {
          name: "foo_1"
          op: "Add"
        }
        node {
          name: "foo_2"
          op: "Add"
        }
        node {
          name: "foo_3"
          op: "Add"
        }
        node {
          name: "foo_4"
          op: "Add"
        }
        node {
          name: "foo_5"
          op: "Add"
        }
      `;
      const slimGraph = await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
      const hierarchy = await slimGraphToHierarchy(slimGraph);
      const nodeNames = Object.keys(hierarchy.getNodeMap()).sort();
      expect(nodeNames).toEqual([
        '__root__',
        'foo_1',
        'foo_2',
        'foo_3',
        'foo_4',
        'foo_5',
        'foo_[1-5]',
      ]);
      expect(hierarchy.getSeriesGroupType('foo_[1-5]')).toBe(
        tf_graph.SeriesGroupingType.GROUP
      );
    });

    it('groups numeric series of nodes with implicit index 0', async () => {
      const pbtxt = `
        node {
          name: "foo"
          op: "Add"
        }
        node {
          name: "foo1"
          op: "Add"
        }
        node {
          name: "foo2"
          op: "Add"
        }
        node {
          name: "foo3"
          op: "Add"
        }
        node {
          name: "foo4"
          op: "Add"
        }
      `;
      const slimGraph = await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
      const hierarchy = await slimGraphToHierarchy(slimGraph);
      const nodeNames = Object.keys(hierarchy.getNodeMap()).sort();
      expect(nodeNames).toEqual([
        '__root__',
        'foo',
        'foo1',
        'foo2',
        'foo3',
        'foo4',
        'foo[0-4]',
      ]);
      expect(hierarchy.getSeriesGroupType('foo[0-4]')).toBe(
        tf_graph.SeriesGroupingType.GROUP
      );
    });

    it('does not group a numeric series of nodes that is too short', async () => {
      const pbtxt = `
        node {
          name: "foo1"
          op: "Add"
        }
        node {
          name: "foo2"
          op: "Add"
        }
        node {
          name: "foo3"
          op: "Add"
        }
        node {
          name: "foo4"
          op: "Add"
        }
      `;
      const slimGraph = await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
      const hierarchy = await slimGraphToHierarchy(slimGraph);
      const nodeNames = Object.keys(hierarchy.getNodeMap()).sort();
      expect(nodeNames).toEqual(['__root__', 'foo1', 'foo2', 'foo3', 'foo4']);
    });

    it('groups a numeric series ignoring NodeDef order in pbtxt', async () => {
      const pbtxt = `
        node {
          name: "foo2"
          op: "Add"
        }
        node {
          name: "foo3"
          op: "Add"
        }
        node {
          name: "foo1"
          op: "Add"
        }
        node {
          name: "foo5"
          op: "Add"
        }
        node {
          name: "foo4"
          op: "Add"
        }
      `;
      const slimGraph = await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
      const hierarchy = await slimGraphToHierarchy(slimGraph);
      const nodeNames = Object.keys(hierarchy.getNodeMap()).sort();
      expect(nodeNames).toEqual([
        '__root__',
        'foo1',
        'foo2',
        'foo3',
        'foo4',
        'foo5',
        'foo[1-5]',
      ]);
    });

    it('does not group a non-sequential numeric series', async () => {
      const pbtxt = `
        node {
          name: "foo1"
          op: "Add"
        }
        node {
          name: "foo3"
          op: "Add"
        }
        node {
          name: "foo5"
          op: "Add"
        }
        node {
          name: "foo7"
          op: "Add"
        }
        node {
          name: "foo9"
          op: "Add"
        }
      `;
      const slimGraph = await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
      const hierarchy = await slimGraphToHierarchy(slimGraph);
      const nodeNames = Object.keys(hierarchy.getNodeMap()).sort();
      expect(nodeNames).toEqual([
        '__root__',
        'foo1',
        'foo3',
        'foo5',
        'foo7',
        'foo9',
      ]);
    });

    it('does not treat a mixed format of underscores as a numeric series', async () => {
      const pbtxt = `
        node {
          name: "foo_1"
          op: "Add"
        }
        node {
          name: "foo2"
          op: "Add"
        }
        node {
          name: "foo_3"
          op: "Add"
        }
        node {
          name: "foo4"
          op: "Add"
        }
        node {
          name: "foo_5"
          op: "Add"
        }
      `;
      const slimGraph = await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
      const hierarchy = await slimGraphToHierarchy(slimGraph);
      const nodeNames = Object.keys(hierarchy.getNodeMap()).sort();
      expect(nodeNames).toEqual([
        '__root__',
        'foo2',
        'foo4',
        'foo_1',
        'foo_3',
        'foo_5',
      ]);
    });

    it('does not group a numeric series whose numbers are not the suffix', async () => {
      const pbtxt = `
        node {
          name: "foo1a"
          op: "Add"
        }
        node {
          name: "foo2a"
          op: "Add"
        }
        node {
          name: "foo3a"
          op: "Add"
        }
        node {
          name: "foo4a"
          op: "Add"
        }
        node {
          name: "foo5a"
          op: "Add"
        }
      `;
      const slimGraph = await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
      const hierarchy = await slimGraphToHierarchy(slimGraph);
      const nodeNames = Object.keys(hierarchy.getNodeMap()).sort();
      expect(nodeNames).toEqual([
        '__root__',
        'foo1a',
        'foo2a',
        'foo3a',
        'foo4a',
        'foo5a',
      ]);
    });

    it('does not group a numeric series whose prefixes do not match', async () => {
      const pbtxt = `
        node {
          name: "foo1"
          op: "Add"
        }
        node {
          name: "bar2"
          op: "Add"
        }
        node {
          name: "foo3"
          op: "Add"
        }
        node {
          name: "bar4"
          op: "Add"
        }
        node {
          name: "foo5"
          op: "Add"
        }
      `;
      const slimGraph = await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
      const hierarchy = await slimGraphToHierarchy(slimGraph);
      const nodeNames = Object.keys(hierarchy.getNodeMap()).sort();
      expect(nodeNames).toEqual([
        '__root__',
        'bar2',
        'bar4',
        'foo1',
        'foo3',
        'foo5',
      ]);
    });
  });

  describe('Graph Normalizing Names', () => {
    it('handles node with empty _output_shapes attr', async () => {
      const pbtxt = `
        node {
          name: "foo1"
          op: "Add"
          attr {
            key: "_output_shapes"
            value {
            }
          }
        }
      `;
      await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
    });

    it('handles node with _output_shapes attr having only single shape', async () => {
      const pbtxt = `
        node {
          name: "foo1"
          op: "Add"
          attr {
            key: "_output_shapes"
            value {
              shape {
              }
            }
          }
        }
      `;
      await graphDefToSlimGraph(await pbtxtToGraphDef(pbtxt));
    });
  });
});

async function slimGraphToHierarchy(
  slimGraph: tf_graph.SlimGraph
): Promise<tf_graph_hierarchy.Hierarchy> {
  return tf_graph_hierarchy.build(
    slimGraph,
    tf_graph_hierarchy.DefaultHierarchyParams,
    createNoopProgressTracker()
  );
}

async function pbtxtToGraphDef(text: string): Promise<tf_graph_proto.GraphDef> {
  const encoder = new TextEncoder();
  return tf_graph_parser.parseGraphPbTxt(encoder.encode(text));
}

async function graphDefToSlimGraph(
  graphDef: tf_graph_proto.GraphDef
): Promise<tf_graph.SlimGraph> {
  return tf_graph.build(
    graphDef,
    tf_graph.DefaultBuildParams,
    createNoopProgressTracker()
  );
}

function createNoopProgressTracker(): tf_graph_common.ProgressTracker {
  return {
    setMessage: () => {},
    updateProgress: () => {},
    reportError: () => {},
  };
}
