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
    class ServerDataProvider {
        constructor(routePrefix) {
            this.runProjectorConfigCache = {};
            this.routePrefix = routePrefix;
        }
        getEmbeddingInfo(run, tensorName, callback) {
            this.retrieveProjectorConfig(run, (config) => {
                const embeddings = config.embeddings;
                for (let i = 0; i < embeddings.length; i++) {
                    const embedding = embeddings[i];
                    if (embedding.tensorName === tensorName) {
                        callback(embedding);
                        return;
                    }
                }
                callback(null);
            });
        }
        retrieveRuns(callback) {
            const msgId = vz_projector.logging.setModalMessage('Fetching runs...');
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${this.routePrefix}/runs`);
            xhr.onerror = (err) => {
                vz_projector.logging.setErrorMessage(xhr.responseText, 'fetching runs');
            };
            xhr.onload = () => {
                const runs = JSON.parse(xhr.responseText);
                vz_projector.logging.setModalMessage(null, msgId);
                callback(runs);
            };
            xhr.send();
        }
        retrieveProjectorConfig(run, callback) {
            if (run in this.runProjectorConfigCache) {
                callback(this.runProjectorConfigCache[run]);
                return;
            }
            const msgId = vz_projector.logging.setModalMessage('Fetching projector config...');
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${this.routePrefix}/info?run=${run}`);
            xhr.onerror = (err) => {
                vz_projector.logging.setErrorMessage(xhr.responseText, 'fetching projector config');
            };
            xhr.onload = () => {
                const config = JSON.parse(xhr.responseText);
                vz_projector.logging.setModalMessage(null, msgId);
                this.runProjectorConfigCache[run] = config;
                callback(config);
            };
            xhr.send();
        }
        retrieveTensor(run, tensorName, callback) {
            this.getEmbeddingInfo(run, tensorName, (embedding) => {
                vz_projector.retrieveTensorAsBytes(this, embedding, run, tensorName, `${this.routePrefix}/tensor?run=${run}&name=${tensorName}` +
                    `&num_rows=${vz_projector.LIMIT_NUM_POINTS}`, callback);
            });
        }
        retrieveSpriteAndMetadata(run, tensorName, callback) {
            this.getEmbeddingInfo(run, tensorName, (embedding) => {
                let metadataPath = null;
                if (embedding.metadataPath) {
                    metadataPath =
                        `${this.routePrefix}/metadata?` +
                            `run=${run}&name=${tensorName}&num_rows=${vz_projector.LIMIT_NUM_POINTS}`;
                }
                let spriteImagePath = null;
                if (embedding.sprite && embedding.sprite.imagePath) {
                    spriteImagePath = `${this.routePrefix}/sprite_image?run=${run}&name=${tensorName}`;
                }
                vz_projector.retrieveSpriteAndMetadataInfo(metadataPath, spriteImagePath, embedding.sprite, callback);
            });
        }
        getBookmarks(run, tensorName, callback) {
            const msgId = vz_projector.logging.setModalMessage('Fetching bookmarks...');
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${this.routePrefix}/bookmarks?run=${run}&name=${tensorName}`);
            xhr.onerror = (err) => {
                vz_projector.logging.setErrorMessage(xhr.responseText, 'fetching bookmarks');
            };
            xhr.onload = () => {
                vz_projector.logging.setModalMessage(null, msgId);
                const bookmarks = JSON.parse(xhr.responseText);
                callback(bookmarks);
            };
            xhr.send();
        }
    }
    vz_projector.ServerDataProvider = ServerDataProvider;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
