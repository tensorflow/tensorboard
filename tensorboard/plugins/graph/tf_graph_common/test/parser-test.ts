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

describe('parser', () => {
  const {assert} = chai;

  it('parses a simple pbtxt', () => {
    const pbtxt = tf.graph.test.util.stringToArrayBuffer(`node {
       name: "Q"
       op: "Input"
     }
     node {
       name: "W"
       op: "Input"
     }
     node {
       name: "X"
       op: "MatMul"
       input: "Q"
       input: "W"
     }`);
    return tf.graph.parser.parseGraphPbTxt(pbtxt).then(graph => {
      let nodes = graph.node;
      assert.isTrue(nodes != null && nodes.length === 3);

      assert.equal('Q', nodes[0].name);
      assert.equal('Input', nodes[0].op);

      assert.equal('W', nodes[1].name);
      assert.equal('Input', nodes[1].op);

      assert.equal('X', nodes[2].name);
      assert.equal('MatMul', nodes[2].op);
      assert.equal('Q', nodes[2].input[0]);
      assert.equal('W', nodes[2].input[1]);
    });
  });

  it('parses an empty pbtxt', () => {
    const pbtxt = tf.graph.test.util.stringToArrayBuffer(``);
    return tf.graph.parser.parseGraphPbTxt(pbtxt).then(graph => {
      assert.notProperty(graph, 'node');
    });
  });

  // TODO: fail hard on malformed pbtxt.
  // Expected it to fail but our parser currently handles it in
  // unpredictable way...
  it('parses malformed pbtxt unpredictably', () => {
    const pbtxt = tf.graph.test.util.stringToArrayBuffer(`node {
      name: "Q"
      op: "Input"
    }
    node { name: "W" op: "Input" }
    node { name: "X" op: "MatMul" input: "Q" input: "W" }`);
    return tf.graph.parser.parseGraphPbTxt(pbtxt).then(graph => {
      const nodes = graph.node;
      assert.isArray(nodes);
      assert.lengthOf(nodes, 1);

      assert.equal('Q', nodes[0].name);
      assert.equal('Input', nodes[0].op);
    });
  });

  it('parses malformed pbtxt unpredictably v2', () => {
    const pbtxt = tf.graph.test.util.stringToArrayBuffer(`node {
      name: "Q"
      op: "Input
    }
    node { name: "W" op: "Input"
    node { name: "X" op: "MatMul" input: "Q" input: "W" }
    node {
      name: A"
      op: "Input"
    }`);
    return tf.graph.parser.parseGraphPbTxt(pbtxt)
        .then(
          () => assert.fail('Should NOT resolve'),
          () => {
            // happy!
          });
  });

  it('parses stats pbtxt', () => {
    let statsPbtxt = tf.graph.test.util.stringToArrayBuffer(`step_stats {
      dev_stats {
        device: "cpu"
        node_stats {
          node_name: "Q"
          all_start_micros: 10
          all_end_rel_micros: 4
        }
        node_stats {
          node_name: "Q"
          all_start_micros: 12
          all_end_rel_micros: 4
        }
      }
    }`);
    return tf.graph.parser.parseStatsPbTxt(statsPbtxt).then(stepStats => {
      assert.equal(stepStats.dev_stats.length, 1);
      assert.equal(stepStats.dev_stats[0].device, 'cpu');
      assert.equal(stepStats.dev_stats[0].node_stats.length, 2);
      assert.equal(stepStats.dev_stats[0].node_stats[0].all_start_micros, 10);
      assert.equal(stepStats.dev_stats[0].node_stats[1].node_name, 'Q');
      assert.equal(stepStats.dev_stats[0].node_stats[1].all_end_rel_micros, 4);
    });
  });

  it('d3 exists', () => {
    assert.isTrue(d3 != null);
  });

  // TODO(nsthorat): write tests.

});
