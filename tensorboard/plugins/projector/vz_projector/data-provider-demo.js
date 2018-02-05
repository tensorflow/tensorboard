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
    var BYTES_EXTENSION = '.bytes';
    /** Data provider that loads data from a demo folder. */
    var DemoDataProvider = /** @class */ (function () {
        function DemoDataProvider(projectorConfigPath) {
            this.projectorConfigPath = projectorConfigPath;
        }
        DemoDataProvider.prototype.getEmbeddingInfo = function (tensorName) {
            var embeddings = this.projectorConfig.embeddings;
            for (var i = 0; i < embeddings.length; i++) {
                var embedding = embeddings[i];
                if (embedding.tensorName === tensorName) {
                    return embedding;
                }
            }
            return null;
        };
        DemoDataProvider.prototype.retrieveRuns = function (callback) {
            callback(['Demo']);
        };
        DemoDataProvider.prototype.retrieveProjectorConfig = function (run, callback) {
            var _this = this;
            var msgId = vz_projector.logging.setModalMessage('Fetching projector config...');
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.projectorConfigPath);
            xhr.onerror = function (err) {
                var errorMessage = err.message;
                // If the error is a valid XMLHttpResponse, it's possible this is a
                // cross-origin error.
                if (xhr.responseText != null) {
                    errorMessage = 'Cannot fetch projector config, possibly a ' +
                        'Cross-Origin request error.';
                }
                vz_projector.logging.setErrorMessage(errorMessage, 'fetching projector config');
            };
            xhr.onload = function () {
                var projectorConfig = JSON.parse(xhr.responseText);
                vz_projector.logging.setModalMessage(null, msgId);
                _this.projectorConfig = projectorConfig;
                callback(projectorConfig);
            };
            xhr.send();
        };
        DemoDataProvider.prototype.retrieveTensor = function (run, tensorName, callback) {
            var embedding = this.getEmbeddingInfo(tensorName);
            var url = "" + embedding.tensorPath;
            if (embedding.tensorPath.substr(-1 * BYTES_EXTENSION.length) ===
                BYTES_EXTENSION) {
                vz_projector.retrieveTensorAsBytes(this, this.getEmbeddingInfo(tensorName), run, tensorName, url, callback);
            }
            else {
                vz_projector.logging.setModalMessage('Fetching tensors...', vz_projector.TENSORS_MSG_ID);
                var request_1 = new XMLHttpRequest();
                request_1.open('GET', url);
                request_1.responseType = 'arraybuffer';
                request_1.onerror = function () {
                    vz_projector.logging.setErrorMessage(request_1.responseText, 'fetching tensors');
                };
                request_1.onload = function () {
                    vz_projector.parseTensors(request_1.response).then(function (points) {
                        callback(new vz_projector.DataSet(points));
                    });
                };
                request_1.send();
            }
        };
        DemoDataProvider.prototype.retrieveSpriteAndMetadata = function (run, tensorName, callback) {
            var embedding = this.getEmbeddingInfo(tensorName);
            var spriteImagePath = null;
            if (embedding.sprite && embedding.sprite.imagePath) {
                spriteImagePath = embedding.sprite.imagePath;
            }
            vz_projector.retrieveSpriteAndMetadataInfo(embedding.metadataPath, spriteImagePath, embedding.sprite, callback);
        };
        DemoDataProvider.prototype.getBookmarks = function (run, tensorName, callback) {
            var embedding = this.getEmbeddingInfo(tensorName);
            var msgId = vz_projector.logging.setModalMessage('Fetching bookmarks...');
            var xhr = new XMLHttpRequest();
            xhr.open('GET', embedding.bookmarksPath);
            xhr.onerror = function (err) {
                vz_projector.logging.setErrorMessage(xhr.responseText);
            };
            xhr.onload = function () {
                var bookmarks = JSON.parse(xhr.responseText);
                vz_projector.logging.setModalMessage(null, msgId);
                callback(bookmarks);
            };
            xhr.send();
        };
        return DemoDataProvider;
    }());
    vz_projector.DemoDataProvider = DemoDataProvider;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
