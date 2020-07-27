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
    const BYTES_EXTENSION = '.bytes';
    /** Data provider that loads data from a demo folder. */
    class DemoDataProvider {
        constructor(projectorConfigPath) {
            this.projectorConfigPath = projectorConfigPath;
        }
        getEmbeddingInfo(tensorName) {
            let embeddings = this.projectorConfig.embeddings;
            for (let i = 0; i < embeddings.length; i++) {
                let embedding = embeddings[i];
                if (embedding.tensorName === tensorName) {
                    return embedding;
                }
            }
            return null;
        }
        retrieveRuns(callback) {
            callback(['Demo']);
        }
        retrieveProjectorConfig(run, callback) {
            const msgId = vz_projector.logging.setModalMessage('Fetching projector config...');
            const xhr = new XMLHttpRequest();
            xhr.open('GET', this.projectorConfigPath);
            xhr.onerror = (err) => {
                let errorMessage = err.message;
                // If the error is a valid XMLHttpResponse, it's possible this is a
                // cross-origin error.
                if (xhr.responseText != null) {
                    errorMessage =
                        'Cannot fetch projector config, possibly a ' +
                            'Cross-Origin request error.';
                }
                vz_projector.logging.setErrorMessage(errorMessage, 'fetching projector config');
            };
            xhr.onload = () => {
                const projectorConfig = JSON.parse(xhr.responseText);
                vz_projector.logging.setModalMessage(null, msgId);
                this.projectorConfig = projectorConfig;
                callback(projectorConfig);
            };
            xhr.send();
        }
        retrieveTensor(run, tensorName, callback) {
            let embedding = this.getEmbeddingInfo(tensorName);
            let url = `${embedding.tensorPath}`;
            if (embedding.tensorPath.substr(-1 * BYTES_EXTENSION.length) ===
                BYTES_EXTENSION) {
                vz_projector.retrieveTensorAsBytes(this, this.getEmbeddingInfo(tensorName), run, tensorName, url, callback);
            }
            else {
                vz_projector.logging.setModalMessage('Fetching tensors...', vz_projector.TENSORS_MSG_ID);
                const request = new XMLHttpRequest();
                request.open('GET', url);
                request.responseType = 'arraybuffer';
                request.onerror = () => {
                    vz_projector.logging.setErrorMessage(request.responseText, 'fetching tensors');
                };
                request.onload = () => {
                    vz_projector.parseTensors(request.response).then((points) => {
                        callback(new vz_projector.DataSet(points));
                    });
                };
                request.send();
            }
        }
        retrieveSpriteAndMetadata(run, tensorName, callback) {
            let embedding = this.getEmbeddingInfo(tensorName);
            let spriteImagePath = null;
            if (embedding.sprite && embedding.sprite.imagePath) {
                spriteImagePath = embedding.sprite.imagePath;
            }
            vz_projector.retrieveSpriteAndMetadataInfo(embedding.metadataPath, spriteImagePath, embedding.sprite, callback);
        }
        getBookmarks(run, tensorName, callback) {
            let embedding = this.getEmbeddingInfo(tensorName);
            let msgId = vz_projector.logging.setModalMessage('Fetching bookmarks...');
            const xhr = new XMLHttpRequest();
            xhr.open('GET', embedding.bookmarksPath);
            xhr.onerror = (err) => {
                vz_projector.logging.setErrorMessage(xhr.responseText);
            };
            xhr.onload = () => {
                const bookmarks = JSON.parse(xhr.responseText);
                vz_projector.logging.setModalMessage(null, msgId);
                callback(bookmarks);
            };
            xhr.send();
        }
    }
    vz_projector.DemoDataProvider = DemoDataProvider;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
