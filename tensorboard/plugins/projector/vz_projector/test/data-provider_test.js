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
        /**
         * Converts a string to an ArrayBuffer.
         */
        function stringToArrayBuffer(str) {
            return new Promise(function (resolve, reject) {
                var blob = new Blob([str]);
                var file = new FileReader();
                file.onload = function (e) {
                    resolve(e.target.result);
                };
                file.readAsArrayBuffer(blob);
            });
        }
        /**
         * Converts an data array to TSV format.
         */
        function dataToTsv(data) {
            var lines = [];
            for (var i = 0; i < data.length; i++) {
                lines.push(data[i].join('\t'));
            }
            return lines.join('\n');
        }
        describe('parse tensors', function () {
            it('parseTensors', function (doneFn) {
                var tensors = [[1.0, 2.0], [2.0, 3.0]];
                stringToArrayBuffer(dataToTsv(tensors))
                    .then(function (tensorsArrayBuffer) {
                    vz_projector.parseTensors(tensorsArrayBuffer)
                        .then(function (data) {
                        test.assert.equal(2, data.length);
                        test.assert.deepEqual(new Float32Array(tensors[0]), data[0].vector);
                        test.assert.equal(0, data[0].index);
                        test.assert.isNull(data[0].projections);
                        test.assert.deepEqual(new Float32Array(tensors[1]), data[1].vector);
                        test.assert.equal(1, data[1].index);
                        test.assert.isNull(data[1].projections);
                        doneFn();
                    });
                });
            });
            it('parseMetadata', function (doneFn) {
                var metadata = [['label', 'fakecol'], ['Г', '0'], ['label1', '1']];
                stringToArrayBuffer(dataToTsv(metadata))
                    .then(function (metadataArrayBuffer) {
                    vz_projector.parseMetadata(metadataArrayBuffer)
                        .then(function (spriteAndMetadataInfo) {
                        test.assert.equal(2, spriteAndMetadataInfo.stats.length);
                        test.assert.equal(metadata[0][0], spriteAndMetadataInfo.stats[0].name);
                        test.assert.isFalse(spriteAndMetadataInfo.stats[0].isNumeric);
                        test.assert.isFalse(spriteAndMetadataInfo.stats[0].tooManyUniqueValues);
                        test.assert.equal(metadata[0][1], spriteAndMetadataInfo.stats[1].name);
                        test.assert.isTrue(spriteAndMetadataInfo.stats[1].isNumeric);
                        test.assert.isFalse(spriteAndMetadataInfo.stats[1].tooManyUniqueValues);
                        test.assert.equal(2, spriteAndMetadataInfo.pointsInfo.length);
                        test.assert.equal(metadata[1][0], spriteAndMetadataInfo.pointsInfo[0]['label']);
                        test.assert.equal(+metadata[1][1], spriteAndMetadataInfo.pointsInfo[0]['fakecol']);
                        test.assert.equal(metadata[2][0], spriteAndMetadataInfo.pointsInfo[1]['label']);
                        test.assert.equal(+metadata[2][1], spriteAndMetadataInfo.pointsInfo[1]['fakecol']);
                        doneFn();
                    });
                });
            });
        });
    })(test = vz_projector.test || (vz_projector.test = {}));
})(vz_projector || (vz_projector = {})); // namespace vz_projector.test
