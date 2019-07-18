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
    const NUM_COLORS_COLOR_MAP = 50;
    const MAX_SPRITE_IMAGE_SIZE_PX = 8192;
    vz_projector.METADATA_MSG_ID = 'metadata';
    vz_projector.TENSORS_MSG_ID = 'tensors';
    function retrieveTensorAsBytes(dp, embedding, run, tensorName, tensorsPath, callback) {
        // Get the tensor.
        vz_projector.logging.setModalMessage('Fetching tensor values...', vz_projector.TENSORS_MSG_ID);
        let xhr = new XMLHttpRequest();
        xhr.open('GET', tensorsPath);
        xhr.responseType = 'arraybuffer';
        xhr.onprogress = (ev) => {
            if (ev.lengthComputable) {
                let percent = (ev.loaded * 100 / ev.total).toFixed(1);
                vz_projector.logging.setModalMessage('Fetching tensor values: ' + percent + '%', vz_projector.TENSORS_MSG_ID);
            }
        };
        xhr.onload = () => {
            if (xhr.status !== 200) {
                let msg = String.fromCharCode.apply(null, new Uint8Array(xhr.response));
                vz_projector.logging.setErrorMessage(msg, 'fetching tensors');
                return;
            }
            let data;
            try {
                data = new Float32Array(xhr.response);
            }
            catch (e) {
                vz_projector.logging.setErrorMessage(e, 'parsing tensor bytes');
                return;
            }
            let dim = embedding.tensorShape[1];
            let N = data.length / dim;
            if (embedding.tensorShape[0] > N) {
                vz_projector.logging.setWarningMessage(`Showing the first ${N.toLocaleString()}` +
                    ` of ${embedding.tensorShape[0].toLocaleString()} data points`);
            }
            parseTensorsFromFloat32Array(data, dim).then(dataPoints => {
                callback(new vz_projector.DataSet(dataPoints));
            });
        };
        xhr.send();
    }
    vz_projector.retrieveTensorAsBytes = retrieveTensorAsBytes;
    function parseRawTensors(content, callback) {
        parseTensors(content).then(data => {
            callback(new vz_projector.DataSet(data));
        });
    }
    vz_projector.parseRawTensors = parseRawTensors;
    function parseRawMetadata(contents, callback) {
        parseMetadata(contents).then(result => callback(result));
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
    function streamParse(content, callback, chunkSize = 1000000, delim = '\n') {
        return new Promise((resolve, reject) => {
            let offset = 0;
            let bufferSize = content.byteLength - 1;
            let data = '';
            function readHandler(str) {
                offset += chunkSize;
                let parts = str.split(delim);
                let first = data + parts[0];
                if (parts.length === 1) {
                    data = first;
                    readChunk(offset, chunkSize);
                    return;
                }
                data = parts[parts.length - 1];
                callback(first);
                for (let i = 1; i < parts.length - 1; i++) {
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
                const contentChunk = content.slice(offset, offset + size);
                const blob = new Blob([contentChunk]);
                const file = new FileReader();
                file.onload = (e) => readHandler(e.target.result);
                file.readAsText(blob);
            }
            readChunk(offset, chunkSize);
        });
    }
    /** Parses a tsv text file. */
    function parseTensors(content, valueDelim = '\t') {
        vz_projector.logging.setModalMessage('Parsing tensors...', vz_projector.TENSORS_MSG_ID);
        return new Promise((resolve, reject) => {
            const data = [];
            let numDim;
            streamParse(content, (line) => {
                line = line.trim();
                if (line === '') {
                    return;
                }
                const row = line.split(valueDelim);
                const dataPoint = {
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
            }).then(() => {
                vz_projector.logging.setModalMessage(null, vz_projector.TENSORS_MSG_ID);
                resolve(data);
            });
        });
    }
    vz_projector.parseTensors = parseTensors;
    /** Parses a tsv text file. */
    function parseTensorsFromFloat32Array(data, dim) {
        return vz_projector.util.runAsyncTask('Parsing tensors...', () => {
            const N = data.length / dim;
            const dataPoints = [];
            let offset = 0;
            for (let i = 0; i < N; ++i) {
                dataPoints.push({
                    metadata: {},
                    vector: data.subarray(offset, offset + dim),
                    index: i,
                    projections: null,
                });
                offset += dim;
            }
            return dataPoints;
        }, vz_projector.TENSORS_MSG_ID).then(dataPoints => {
            vz_projector.logging.setModalMessage(null, vz_projector.TENSORS_MSG_ID);
            return dataPoints;
        });
    }
    vz_projector.parseTensorsFromFloat32Array = parseTensorsFromFloat32Array;
    function analyzeMetadata(columnNames, pointsMetadata) {
        const columnStats = columnNames.map(name => {
            return {
                name: name,
                isNumeric: true,
                tooManyUniqueValues: false,
                min: Number.POSITIVE_INFINITY,
                max: Number.NEGATIVE_INFINITY
            };
        });
        const mapOfValues = columnNames.map(() => new Object());
        pointsMetadata.forEach(metadata => {
            columnNames.forEach((name, colIndex) => {
                const stats = columnStats[colIndex];
                const map = mapOfValues[colIndex];
                const value = metadata[name];
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
        columnStats.forEach((stats, colIndex) => {
            stats.uniqueEntries = Object.keys(mapOfValues[colIndex]).map(label => {
                return { label, count: mapOfValues[colIndex][label] };
            });
        });
        return columnStats;
    }
    vz_projector.analyzeMetadata = analyzeMetadata;
    function parseMetadata(content) {
        vz_projector.logging.setModalMessage('Parsing metadata...', vz_projector.METADATA_MSG_ID);
        return new Promise((resolve, reject) => {
            let pointsMetadata = [];
            let hasHeader = false;
            let lineNumber = 0;
            let columnNames = ['label'];
            streamParse(content, (line) => {
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
                let rowValues = line.split('\t');
                let metadata = {};
                pointsMetadata.push(metadata);
                columnNames.forEach((name, colIndex) => {
                    let value = rowValues[colIndex];
                    // Normalize missing values.
                    value = (value === '' ? null : value);
                    metadata[name] = value;
                });
            }).then(() => {
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
        return new Promise((resolve, reject) => {
            let image = new Image();
            image.onload = () => resolve(image);
            image.onerror = (err) => reject(err);
            image.crossOrigin = '';
            image.src = url;
        });
    }
    vz_projector.fetchImage = fetchImage;
    function retrieveSpriteAndMetadataInfo(metadataPath, spriteImagePath, spriteMetadata, callback) {
        let metadataPromise = Promise.resolve({});
        if (metadataPath) {
            metadataPromise = new Promise((resolve, reject) => {
                vz_projector.logging.setModalMessage('Fetching metadata...', vz_projector.METADATA_MSG_ID);
                const request = new XMLHttpRequest();
                request.open('GET', metadataPath);
                request.responseType = 'arraybuffer';
                request.onreadystatechange = () => {
                    if (request.readyState === 4) {
                        if (request.status === 200) {
                            // The metadata was successfully retrieved. Parse it.
                            resolve(parseMetadata(request.response));
                        }
                        else {
                            // The response contains the error message, but we must convert it
                            // to a string.
                            const errorReader = new FileReader();
                            errorReader.onload = () => {
                                vz_projector.logging.setErrorMessage(errorReader.result, 'fetching metadata');
                                reject();
                            };
                            errorReader.readAsText(new Blob([request.response]));
                        }
                    }
                };
                request.send(null);
            });
        }
        let spriteMsgId = null;
        let spritesPromise = null;
        if (spriteImagePath) {
            spriteMsgId = vz_projector.logging.setModalMessage('Fetching sprite image...');
            spritesPromise = fetchImage(spriteImagePath);
        }
        // Fetch the metadata and the image in parallel.
        Promise.all([metadataPromise, spritesPromise]).then(values => {
            if (spriteMsgId) {
                vz_projector.logging.setModalMessage(null, spriteMsgId);
            }
            const [metadata, spriteImage] = values;
            if (spriteImage && (spriteImage.height > MAX_SPRITE_IMAGE_SIZE_PX ||
                spriteImage.width > MAX_SPRITE_IMAGE_SIZE_PX)) {
                vz_projector.logging.setModalMessage(`Error: Sprite image of dimensions ${spriteImage.width}px x ` +
                    `${spriteImage.height}px exceeds maximum dimensions ` +
                    `${MAX_SPRITE_IMAGE_SIZE_PX}px x ${MAX_SPRITE_IMAGE_SIZE_PX}px`);
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
