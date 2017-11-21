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
    var ProtoDataProvider = /** @class */ (function () {
        function ProtoDataProvider(dataProto) {
            this.dataProto = dataProto;
        }
        ProtoDataProvider.prototype.retrieveRuns = function (callback) {
            callback(['proto']);
        };
        ProtoDataProvider.prototype.retrieveProjectorConfig = function (run, callback) {
            callback({
                modelCheckpointPath: 'proto',
                embeddings: [{
                        tensorName: 'proto',
                        tensorShape: this.dataProto.shape,
                        metadataPath: 'proto'
                    }]
            });
        };
        ProtoDataProvider.prototype.retrieveTensor = function (run, tensorName, callback) {
            callback(this.flatArrayToDataset(this.dataProto.tensor));
        };
        ProtoDataProvider.prototype.retrieveSpriteAndMetadata = function (run, tensorName, callback) {
            var _this = this;
            var columnNames = this.dataProto.metadata.columns.map(function (c) { return c.name; });
            var n = this.dataProto.shape[0];
            var pointsMetadata = new Array(n);
            this.dataProto.metadata.columns.forEach(function (c) {
                var values = c.numericValues || c.stringValues;
                for (var i = 0; i < n; i++) {
                    pointsMetadata[i] = pointsMetadata[i] || {};
                    pointsMetadata[i][c.name] = values[i];
                }
            });
            var spritesPromise = Promise.resolve(null);
            if (this.dataProto.metadata.sprite != null) {
                spritesPromise = new Promise(function (resolve, reject) {
                    var image = new Image();
                    image.onload = function () { return resolve(image); };
                    image.onerror = function () { return reject('Failed converting base64 to an image'); };
                    image.src = _this.dataProto.metadata.sprite.imageBase64;
                });
            }
            spritesPromise.then(function (image) {
                var result = {
                    stats: vz_projector.analyzeMetadata(columnNames, pointsMetadata),
                    pointsInfo: pointsMetadata
                };
                if (image != null) {
                    result.spriteImage = image;
                    result.spriteMetadata = {
                        singleImageDim: _this.dataProto.metadata.sprite.singleImageDim,
                        imagePath: 'proto'
                    };
                }
                callback(result);
            });
        };
        ProtoDataProvider.prototype.getBookmarks = function (run, tensorName, callback) {
            return callback([]);
        };
        ProtoDataProvider.prototype.flatArrayToDataset = function (tensor) {
            var points = [];
            var n = this.dataProto.shape[0];
            var d = this.dataProto.shape[1];
            if (n * d !== tensor.length) {
                throw 'The shape doesn\'t match the length of the flattened array';
            }
            for (var i = 0; i < n; i++) {
                var offset = i * d;
                points.push({
                    vector: new Float32Array(tensor.slice(offset, offset + d)),
                    metadata: {},
                    projections: null,
                    index: i
                });
            }
            return new vz_projector.DataSet(points);
        };
        return ProtoDataProvider;
    }());
    vz_projector.ProtoDataProvider = ProtoDataProvider;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
