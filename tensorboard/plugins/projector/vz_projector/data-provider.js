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
    /** Maximum number of colors supported in the color map. */
    var NUM_COLORS_COLOR_MAP = 50;
    var MAX_SPRITE_IMAGE_SIZE_PX = 8192;
    vz_projector.METADATA_MSG_ID = 'metadata';
    vz_projector.TENSORS_MSG_ID = 'tensors';
    function retrieveTensorAsBytes(dp, embedding, run, tensorName, tensorsPath, callback) {
        // Get the tensor.
        vz_projector.logging.setModalMessage('Fetching tensor values...', vz_projector.TENSORS_MSG_ID);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', tensorsPath);
        xhr.responseType = 'arraybuffer';
        xhr.onprogress = function (ev) {
            if (ev.lengthComputable) {
                var percent = (ev.loaded * 100 / ev.total).toFixed(1);
                vz_projector.logging.setModalMessage('Fetching tensor values: ' + percent + '%', vz_projector.TENSORS_MSG_ID);
            }
        };
        xhr.onload = function () {
            if (xhr.status !== 200) {
                var msg = String.fromCharCode.apply(null, new Uint8Array(xhr.response));
                vz_projector.logging.setErrorMessage(msg, 'fetching tensors');
                return;
            }
            var data;
            try {
                data = new Float32Array(xhr.response);
            }
            catch (e) {
                vz_projector.logging.setErrorMessage(e, 'parsing tensor bytes');
                return;
            }
            var dim = embedding.tensorShape[1];
            var N = data.length / dim;
            if (embedding.tensorShape[0] > N) {
                vz_projector.logging.setWarningMessage("Showing the first " + N.toLocaleString() +
                    (" of " + embedding.tensorShape[0].toLocaleString() + " data points"));
            }
            parseTensorsFromFloat32Array(data, dim).then(function (dataPoints) {
                callback(new vz_projector.DataSet(dataPoints));
            });
        };
        xhr.send();
    }
    vz_projector.retrieveTensorAsBytes = retrieveTensorAsBytes;
    function parseRawTensors(content, callback) {
        parseTensors(content).then(function (data) {
            callback(new vz_projector.DataSet(data));
        });
    }
    vz_projector.parseRawTensors = parseRawTensors;
    function parseRawMetadata(contents, callback) {
        parseMetadata(contents).then(function (result) { return callback(result); });
    }
    vz_projector.parseRawMetadata = parseRawMetadata;
    /**
     * Parse an ArrayBuffer in a streaming fashion line by line (or custom delim).
     * Can handle very large files.
     *
     * @param content The array buffer.
     * @param callback The callback called on each line.
     * @param chunkSize The size of each read chunk, defaults to ~1MB. (optional)
     * @param delim The delimiter used to split a line, defaults to '\n'. (optional)
     * @returns A promise for when it is finished.
     */
    function streamParse(content, callback, chunkSize, delim) {
        if (chunkSize === void 0) { chunkSize = 1000000; }
        if (delim === void 0) { delim = '\n'; }
        return new Promise(function (resolve, reject) {
            var offset = 0;
            var bufferSize = content.byteLength - 1;
            var data = '';
            function readHandler(str) {
                offset += chunkSize;
                var parts = str.split(delim);
                var first = data + parts[0];
                if (parts.length === 1) {
                    data = first;
                    readChunk(offset, chunkSize);
                    return;
                }
                data = parts[parts.length - 1];
                callback(first);
                for (var i = 1; i < parts.length - 1; i++) {
                    callback(parts[i]);
                }
                if (offset >= bufferSize) {
                    if (data) {
                        callback(data);
                    }
                    resolve();
                    return;
                }
                readChunk(offset, chunkSize);
            }
            function readChunk(offset, size) {
                var contentChunk = content.slice(offset, offset + size);
                var blob = new Blob([contentChunk]);
                var file = new FileReader();
                file.onload = function (e) { return readHandler(e.target.result); };
                file.readAsText(blob);
            }
            readChunk(offset, chunkSize);
        });
    }
    /** Parses a tsv text file. */
    function parseTensors(content, valueDelim) {
        if (valueDelim === void 0) { valueDelim = '\t'; }
        vz_projector.logging.setModalMessage('Parsing tensors...', vz_projector.TENSORS_MSG_ID);
        return new Promise(function (resolve, reject) {
            var data = [];
            var numDim;
            streamParse(content, function (line) {
                line = line.trim();
                if (line === '') {
                    return;
                }
                var row = line.split(valueDelim);
                var dataPoint = {
                    metadata: {},
                    vector: null,
                    index: data.length,
                    projections: null,
                };
                // If the first label is not a number, take it as the label.
                if (isNaN(row[0]) || numDim === row.length - 1) {
                    dataPoint.metadata['label'] = row[0];
                    dataPoint.vector = new Float32Array(row.slice(1).map(Number));
                }
                else {
                    dataPoint.vector = new Float32Array(row.map(Number));
                }
                data.push(dataPoint);
                if (numDim == null) {
                    numDim = dataPoint.vector.length;
                }
                if (numDim !== dataPoint.vector.length) {
                    vz_projector.logging.setModalMessage('Parsing failed. Vector dimensions do not match');
                    throw Error('Parsing failed');
                }
                if (numDim <= 1) {
                    vz_projector.logging.setModalMessage('Parsing failed. Found a vector with only one dimension?');
                    throw Error('Parsing failed');
                }
            }).then(function () {
                vz_projector.logging.setModalMessage(null, vz_projector.TENSORS_MSG_ID);
                resolve(data);
            });
        });
    }
    vz_projector.parseTensors = parseTensors;
    /** Parses a tsv text file. */
    function parseTensorsFromFloat32Array(data, dim) {
        return vz_projector.util.runAsyncTask('Parsing tensors...', function () {
            var N = data.length / dim;
            var dataPoints = [];
            var offset = 0;
            for (var i = 0; i < N; ++i) {
                dataPoints.push({
                    metadata: {},
                    vector: data.subarray(offset, offset + dim),
                    index: i,
                    projections: null,
                });
                offset += dim;
            }
            return dataPoints;
        }, vz_projector.TENSORS_MSG_ID).then(function (dataPoints) {
            vz_projector.logging.setModalMessage(null, vz_projector.TENSORS_MSG_ID);
            return dataPoints;
        });
    }
    vz_projector.parseTensorsFromFloat32Array = parseTensorsFromFloat32Array;
    function analyzeMetadata(columnNames, pointsMetadata) {
        var columnStats = columnNames.map(function (name) {
            return {
                name: name,
                isNumeric: true,
                tooManyUniqueValues: false,
                min: Number.POSITIVE_INFINITY,
                max: Number.NEGATIVE_INFINITY
            };
        });
        var mapOfValues = columnNames.map(function () { return new Object(); });
        pointsMetadata.forEach(function (metadata) {
            columnNames.forEach(function (name, colIndex) {
                var stats = columnStats[colIndex];
                var map = mapOfValues[colIndex];
                var value = metadata[name];
                // Skip missing values.
                if (value == null) {
                    return;
                }
                if (!stats.tooManyUniqueValues) {
                    if (value in map) {
                        map[value]++;
                    }
                    else {
                        map[value] = 1;
                    }
                    if (Object.keys(map).length > NUM_COLORS_COLOR_MAP) {
                        stats.tooManyUniqueValues = true;
                    }
                }
                if (isNaN(value)) {
                    stats.isNumeric = false;
                }
                else {
                    metadata[name] = +value;
                    stats.min = Math.min(stats.min, +value);
                    stats.max = Math.max(stats.max, +value);
                }
            });
        });
        columnStats.forEach(function (stats, colIndex) {
            stats.uniqueEntries = Object.keys(mapOfValues[colIndex]).map(function (label) {
                return { label: label, count: mapOfValues[colIndex][label] };
            });
        });
        return columnStats;
    }
    vz_projector.analyzeMetadata = analyzeMetadata;
    function parseMetadata(content) {
        vz_projector.logging.setModalMessage('Parsing metadata...', vz_projector.METADATA_MSG_ID);
        return new Promise(function (resolve, reject) {
            var pointsMetadata = [];
            var hasHeader = false;
            var lineNumber = 0;
            var columnNames = ['label'];
            streamParse(content, function (line) {
                if (line.trim().length === 0) {
                    return;
                }
                if (lineNumber === 0) {
                    hasHeader = line.indexOf('\t') >= 0;
                    // If the first row doesn't contain metadata keys, we assume that the
                    // values are labels.
                    if (hasHeader) {
                        columnNames = line.split('\t');
                        lineNumber++;
                        return;
                    }
                }
                lineNumber++;
                var rowValues = line.split('\t');
                var metadata = {};
                pointsMetadata.push(metadata);
                columnNames.forEach(function (name, colIndex) {
                    var value = rowValues[colIndex];
                    // Normalize missing values.
                    value = (value === '' ? null : value);
                    metadata[name] = value;
                });
            }).then(function () {
                vz_projector.logging.setModalMessage(null, vz_projector.METADATA_MSG_ID);
                resolve({
                    stats: analyzeMetadata(columnNames, pointsMetadata),
                    pointsInfo: pointsMetadata
                });
            });
        });
    }
    vz_projector.parseMetadata = parseMetadata;
    function fetchImage(url) {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            image.onload = function () { return resolve(image); };
            image.onerror = function (err) { return reject(err); };
            image.crossOrigin = '';
            image.src = url;
        });
    }
    vz_projector.fetchImage = fetchImage;
    function retrieveSpriteAndMetadataInfo(metadataPath, spriteImagePath, spriteMetadata, callback) {
        var metadataPromise = Promise.resolve({});
        if (metadataPath) {
            metadataPromise = new Promise(function (resolve, reject) {
                vz_projector.logging.setModalMessage('Fetching metadata...', vz_projector.METADATA_MSG_ID);
                var request = new XMLHttpRequest();
                request.open('GET', metadataPath);
                request.responseType = 'arraybuffer';
                request.onreadystatechange = function () {
                    if (request.readyState === 4) {
                        if (request.status === 200) {
                            // The metadata was successfully retrieved. Parse it.
                            resolve(parseMetadata(request.response));
                        }
                        else {
                            // The response contains the error message, but we must convert it
                            // to a string.
                            var errorReader_1 = new FileReader();
                            errorReader_1.onload = function () {
                                vz_projector.logging.setErrorMessage(errorReader_1.result, 'fetching metadata');
                                reject();
                            };
                            errorReader_1.readAsText(new Blob([request.response]));
                        }
                    }
                };
                request.send(null);
            });
        }
        var spriteMsgId = null;
        var spritesPromise = null;
        if (spriteImagePath) {
            spriteMsgId = vz_projector.logging.setModalMessage('Fetching sprite image...');
            spritesPromise = fetchImage(spriteImagePath);
        }
        // Fetch the metadata and the image in parallel.
        Promise.all([metadataPromise, spritesPromise]).then(function (values) {
            if (spriteMsgId) {
                vz_projector.logging.setModalMessage(null, spriteMsgId);
            }
            var metadata = values[0], spriteImage = values[1];
            if (spriteImage && (spriteImage.height > MAX_SPRITE_IMAGE_SIZE_PX ||
                spriteImage.width > MAX_SPRITE_IMAGE_SIZE_PX)) {
                vz_projector.logging.setModalMessage("Error: Sprite image of dimensions " + spriteImage.width + "px x " +
                    (spriteImage.height + "px exceeds maximum dimensions ") +
                    (MAX_SPRITE_IMAGE_SIZE_PX + "px x " + MAX_SPRITE_IMAGE_SIZE_PX + "px"));
            }
            else {
                metadata.spriteImage = spriteImage;
                metadata.spriteMetadata = spriteMetadata;
                try {
                    callback(metadata);
                }
                catch (e) {
                    vz_projector.logging.setModalMessage(String(e));
                }
            }
        });
    }
    vz_projector.retrieveSpriteAndMetadataInfo = retrieveSpriteAndMetadataInfo;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
