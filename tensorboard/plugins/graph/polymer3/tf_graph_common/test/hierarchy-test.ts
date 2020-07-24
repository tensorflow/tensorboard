/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
describe('hierarchy', () => {
  const {expect} = chai;

  beforeEach(function() {
    const pbtxt = tf.graph.test.util.stringToArrayBuffer(`
      node {
        name: "Q"
        op: "VariableV2"
        attr {
          key: "_output_shapes"
          value {
            list {
              shape {
                dim {
                  size: 100
                }
                dim {
                  size: 200
                }
              }
            }
          }
        }
        attr {
          key: "container"
          value {
            s: ""
          }
        }
        attr {
          key: "dtype"
          value {
            type: DT_FLOAT
          }
        }
        attr {
          key: "shape"
          value {
            shape {
              dim {
                size: 100
              }
              dim {
                size: 200
              }
            }
          }
        }
      }
      node {
        name: "W"
        op: "VariableV2"
        attr {
          key: "_output_shapes"
          value {
            list {
              shape {
                dim {
                  size: 200
                }
                dim {
                  size: 100
                }
              }
            }
          }
        }
        attr {
          key: "container"
          value {
            s: ""
          }
        }
        attr {
          key: "dtype"
          value {
            type: DT_FLOAT
          }
        }
        attr {
          key: "shape"
          value {
            shape {
              dim {
                size: 200
              }
              dim {
                size: 100
              }
            }
          }
        }
      }
      node {
        name: "Y"
        op: "MatMul"
        input: "Q"
        input: "W"
      }`);
    const buildParams: tf.graph.BuildParams = {
      enableEmbedding: true,
      inEmbeddingTypes: ['Const'],
      outEmbeddingTypes: ['^[a-zA-Z]+Summary$'],
      refEdges: {},
    };
    this.dummyTracker = tf.graph.util.getTracker({
      set: () => {},
      progress: 0,
    });
    this.options = {
      verifyTemplate: true,
      seriesNodeMinSize: 5,
      seriesMap: {},
      rankDirection: '',
      useGeneralizedSeriesPatterns: false,
    };
    return tf.graph.parser
      .parseGraphPbTxt(pbtxt)
      .then((nodes) => tf.graph.build(nodes, buildParams, this.dummyTracker))
      .then((graph: tf.graph.SlimGraph) => (this.slimGraph = graph));
  });

  it('builds hierarchy with metagraph', function() {
    return tf.graph.hierarchy
      .build(this.slimGraph, this.options, this.dummyTracker)
      .then((hierarchy) => {
        if (!hierarchy) throw new Error('Expected hierarchy to be built');
        expect(hierarchy.hasShapeInfo).to.be.true;
        expect(hierarchy.maxMetaEdgeSize).to.equal(20000);
        expect(hierarchy.root.metagraph.edge('Q', 'Y')).to.exist;
        expect(hierarchy.root.metagraph.edge('W', 'Y')).to.exist;
        // Not symmetric.
        expect(hierarchy.root.metagraph.edge('Y', 'Q')).to.not.exist;
        // Two variables are not connected directly.
        expect(hierarchy.root.metagraph.edge('Q', 'W')).to.not.exist;

        const edge = hierarchy.root.metagraph.edge('Q', 'Y');
        expect(edge.totalSize).to.equal(20000);
        expect(edge.v).to.equal('Q');
        expect(edge.w).to.equal('Y');
      });
  });

  /* TODO(tensorflow-authors): write more test on cases when there are no
   *  connections, misses shape info, scalar, and graph with grouping.
   * Might be better to write an integrational test with a complex graph.pbtxt.
   */
});
