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
var expect = chai.expect;
describe('hierarchy', function () {
    beforeEach(function () {
        var _this = this;
        var pbtxt = tf.graph.test.util.stringToArrayBuffer("\n      node {\n        name: \"Q\"\n        op: \"VariableV2\"\n        attr {\n          key: \"_output_shapes\"\n          value {\n            list {\n              shape {\n                dim {\n                  size: 100\n                }\n                dim {\n                  size: 200\n                }\n              }\n            }\n          }\n        }\n        attr {\n          key: \"container\"\n          value {\n            s: \"\"\n          }\n        }\n        attr {\n          key: \"dtype\"\n          value {\n            type: DT_FLOAT\n          }\n        }\n        attr {\n          key: \"shape\"\n          value {\n            shape {\n              dim {\n                size: 100\n              }\n              dim {\n                size: 200\n              }\n            }\n          }\n        }\n      }\n      node {\n        name: \"W\"\n        op: \"VariableV2\"\n        attr {\n          key: \"_output_shapes\"\n          value {\n            list {\n              shape {\n                dim {\n                  size: 200\n                }\n                dim {\n                  size: 100\n                }\n              }\n            }\n          }\n        }\n        attr {\n          key: \"container\"\n          value {\n            s: \"\"\n          }\n        }\n        attr {\n          key: \"dtype\"\n          value {\n            type: DT_FLOAT\n          }\n        }\n        attr {\n          key: \"shape\"\n          value {\n            shape {\n              dim {\n                size: 200\n              }\n              dim {\n                size: 100\n              }\n            }\n          }\n        }\n      }\n      node {\n        name: \"Y\"\n        op: \"MatMul\"\n        input: \"Q\"\n        input: \"W\"\n      }");
        var buildParams = {
            enableEmbedding: true,
            inEmbeddingTypes: ['Const'],
            outEmbeddingTypes: ['^[a-zA-Z]+Summary$'],
            refEdges: {}
        };
        this.dummyTracker = tf.graph.util.getTracker({
            set: function () { },
            progress: 0,
        });
        this.options = {
            verifyTemplate: true,
            seriesNodeMinSize: 5,
            seriesMap: {},
            rankDirection: '',
            useGeneralizedSeriesPatterns: false,
        };
        return tf.graph.parser.parseGraphPbTxt(pbtxt)
            .then(function (nodes) { return tf.graph.build(nodes, buildParams, _this.dummyTracker); })
            .then(function (graph) { return _this.slimGraph = graph; });
    });
    it('builds hierarchy with metagraph', function () {
        return tf.graph.hierarchy
            .build(this.slimGraph, this.options, this.dummyTracker)
            .then(function (hierarchy) {
            if (!hierarchy)
                throw new Error('Expected hierarchy to be built');
            expect(hierarchy.hasShapeInfo).to.be.true;
            expect(hierarchy.maxMetaEdgeSize).to.equal(20000);
            expect(hierarchy.root.metagraph.edge('Q', 'Y')).to.exist;
            expect(hierarchy.root.metagraph.edge('W', 'Y')).to.exist;
            // Not symmetric.
            expect(hierarchy.root.metagraph.edge('Y', 'Q')).to.not.exist;
            // Two variables are not connected directly.
            expect(hierarchy.root.metagraph.edge('Q', 'W')).to.not.exist;
            var edge = hierarchy.root.metagraph.edge('Q', 'Y');
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
