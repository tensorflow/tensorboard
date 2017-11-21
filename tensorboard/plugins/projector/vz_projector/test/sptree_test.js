/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
var vz_projector;
(function (vz_projector) {
    var test;
    (function (test) {
        it('simple 2D data', function () {
            var data = [
                [0, 1],
                [1, 0],
                [1, 1],
                [0, 0],
            ];
            var tree = new vz_projector.SPTree(data);
            // Check that each point is within the bound.
            tree.visit(function (node, low, high) {
                test.assert.equal(low.length, 2);
                test.assert.equal(high.length, 2);
                var point = node.point;
                test.assert.equal(point.length, 2);
                // Each point should be in the node's bounding box.
                test.assert.equal(point[0] >= low[0] && point[0] <= high[0] && point[1] >= low[1] &&
                    point[1] <= high[1], true);
                return false;
            });
        });
        it('simple 3D data', function () {
            var data = [
                [0, 1, 0],
                [1, 0.4, 2],
                [1, 1, 3],
                [0, 0, 5],
            ];
            var tree = new vz_projector.SPTree(data);
            // Check that each point is within the bound.
            tree.visit(function (node, low, high) {
                test.assert.equal(low.length, 3);
                test.assert.equal(high.length, 3);
                var point = node.point;
                test.assert.equal(point.length, 3);
                // Each point should be in the node's bounding box.
                test.assert.equal(point[0] >= low[0] && point[0] <= high[0] && point[1] >= low[1] &&
                    point[1] <= high[1] && point[2] >= low[2] && point[2] <= high[2], true);
                return false;
            });
        });
        it('Only visit root', function () {
            var data = [
                [0, 1, 0],
                [1, 0.4, 2],
                [1, 1, 3],
                [0, 0, 5],
            ];
            var tree = new vz_projector.SPTree(data);
            var numVisits = 0;
            tree.visit(function (node, low, high) {
                numVisits++;
                return true;
            });
            test.assert.equal(numVisits, 1);
        });
        it('Search in random data', function () {
            var N = 10000;
            var data = new Array(N);
            for (var i = 0; i < N; i++) {
                data[i] = [Math.random(), Math.random()];
            }
            var tree = new vz_projector.SPTree(data);
            var numVisits = 0;
            var query = data[Math.floor(Math.random() * N)];
            var found = false;
            tree.visit(function (node, low, high) {
                numVisits++;
                if (node.point === query) {
                    found = true;
                    return true;
                }
                var outOfBounds = query[0] < low[0] || query[0] > high[0] ||
                    query[1] < low[1] || query[1] > high[1];
                return outOfBounds;
            });
            test.assert.equal(found, true);
            test.assert.isBelow(numVisits, N / 4);
        });
    })(test = vz_projector.test || (vz_projector.test = {}));
})(vz_projector || (vz_projector = {})); // namespace vz_projector.test
