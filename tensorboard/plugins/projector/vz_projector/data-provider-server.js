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
    // Limit for the number of data points we receive from the server.
    vz_projector.LIMIT_NUM_POINTS = 100000;
    /**
     * Data provider that loads data provided by a python server (usually backed
     * by a checkpoint file).
     */
    var ServerDataProvider = /** @class */ (function () {
        function ServerDataProvider(routePrefix) {
            this.runProjectorConfigCache = {};
            this.routePrefix = routePrefix;
        }
        ServerDataProvider.prototype.getEmbeddingInfo = function (run, tensorName, callback) {
            this.retrieveProjectorConfig(run, function (config) {
                var embeddings = config.embeddings;
                for (var i = 0; i < embeddings.length; i++) {
                    var embedding = embeddings[i];
                    if (embedding.tensorName === tensorName) {
                        callback(embedding);
                        return;
                    }
                }
                callback(null);
            });
        };
        ServerDataProvider.prototype.retrieveRuns = function (callback) {
            var msgId = vz_projector.logging.setModalMessage('Fetching runs...');
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.routePrefix + "/runs");
            xhr.onerror = function (err) {
                vz_projector.logging.setErrorMessage(xhr.responseText, 'fetching runs');
            };
            xhr.onload = function () {
                var runs = JSON.parse(xhr.responseText);
                vz_projector.logging.setModalMessage(null, msgId);
                callback(runs);
            };
            xhr.send();
        };
        ServerDataProvider.prototype.retrieveProjectorConfig = function (run, callback) {
            var _this = this;
            if (run in this.runProjectorConfigCache) {
                callback(this.runProjectorConfigCache[run]);
                return;
            }
            var msgId = vz_projector.logging.setModalMessage('Fetching projector config...');
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.routePrefix + "/info?run=" + run);
            xhr.onerror = function (err) {
                vz_projector.logging.setErrorMessage(xhr.responseText, 'fetching projector config');
            };
            xhr.onload = function () {
                var config = JSON.parse(xhr.responseText);
                vz_projector.logging.setModalMessage(null, msgId);
                _this.runProjectorConfigCache[run] = config;
                callback(config);
            };
            xhr.send();
        };
        ServerDataProvider.prototype.retrieveTensor = function (run, tensorName, callback) {
            var _this = this;
            this.getEmbeddingInfo(run, tensorName, function (embedding) {
                vz_projector.retrieveTensorAsBytes(_this, embedding, run, tensorName, _this.routePrefix + "/tensor?run=" + run + "&name=" + tensorName +
                    ("&num_rows=" + vz_projector.LIMIT_NUM_POINTS), callback);
            });
        };
        ServerDataProvider.prototype.retrieveSpriteAndMetadata = function (run, tensorName, callback) {
            var _this = this;
            this.getEmbeddingInfo(run, tensorName, function (embedding) {
                var metadataPath = null;
                if (embedding.metadataPath) {
                    metadataPath =
                        _this.routePrefix + "/metadata?" +
                            ("run=" + run + "&name=" + tensorName + "&num_rows=" + vz_projector.LIMIT_NUM_POINTS);
                }
                var spriteImagePath = null;
                if (embedding.sprite && embedding.sprite.imagePath) {
                    spriteImagePath =
                        _this.routePrefix + "/sprite_image?run=" + run + "&name=" + tensorName;
                }
                vz_projector.retrieveSpriteAndMetadataInfo(metadataPath, spriteImagePath, embedding.sprite, callback);
            });
        };
        ServerDataProvider.prototype.getBookmarks = function (run, tensorName, callback) {
            var msgId = vz_projector.logging.setModalMessage('Fetching bookmarks...');
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.routePrefix + "/bookmarks?run=" + run + "&name=" + tensorName);
            xhr.onerror = function (err) {
                vz_projector.logging.setErrorMessage(xhr.responseText, 'fetching bookmarks');
            };
            xhr.onload = function () {
                vz_projector.logging.setModalMessage(null, msgId);
                var bookmarks = JSON.parse(xhr.responseText);
                callback(bookmarks);
            };
            xhr.send();
        };
        return ServerDataProvider;
    }());
    vz_projector.ServerDataProvider = ServerDataProvider;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
