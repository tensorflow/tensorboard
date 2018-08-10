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
var tf;
(function (tf) {
    var graph;
    (function (graph) {
        var parser;
        (function (parser) {
            /**
             * Parses a native js value, which can be either a string, boolean or number.
             *
             * @param value The value to be parsed.
             */
            function parseValue(value) {
                if (value === 'true') {
                    return true;
                }
                if (value === 'false') {
                    return false;
                }
                var firstChar = value[0];
                if (firstChar === '"') {
                    return value.substring(1, value.length - 1);
                }
                var num = parseFloat(value);
                return isNaN(num) ? value : num;
            }
            /**
             * Fetches a text file and returns a promise of the result.
             */
            function fetchPbTxt(filepath) {
                return new Promise(function (resolve, reject) {
                    var request = new XMLHttpRequest();
                    request.open('GET', filepath);
                    request.responseType = 'arraybuffer';
                    request.onerror = function () { return reject(request.status); };
                    request.onload = function () { return resolve(request.response); };
                    request.send(null);
                });
            }
            parser.fetchPbTxt = fetchPbTxt;
            /**
             * Fetches the metadata file, parses it and returns a promise of the result.
             */
            function fetchAndParseMetadata(path, tracker) {
                return tf.graph.util
                    .runTask('Reading metadata pbtxt', 40, function () {
                    if (path == null) {
                        return Promise.resolve(null);
                    }
                    return fetchPbTxt(path);
                }, tracker)
                    .then(function (arrayBuffer) {
                    return tf.graph.util.runAsyncPromiseTask('Parsing metadata.pbtxt', 60, function () {
                        return arrayBuffer != null ? parseStatsPbTxt(arrayBuffer) :
                            Promise.resolve(null);
                    }, tracker);
                });
            }
            parser.fetchAndParseMetadata = fetchAndParseMetadata;
            /**
             * Fetches the graph file, parses it and returns a promise of the result. The
             * result will be undefined if the graph is empty.
             */
            function fetchAndParseGraphData(path, pbTxtFile, tracker) {
                return tf.graph.util
                    .runTask('Reading graph pbtxt', 40, function () {
                    if (pbTxtFile) {
                        return new Promise(function (resolve, reject) {
                            var fileReader = new FileReader();
                            fileReader.onload = function () { return resolve(fileReader.result); };
                            fileReader.onerror = function () { return reject(fileReader.error); };
                            fileReader.readAsArrayBuffer(pbTxtFile);
                        });
                    }
                    else {
                        return fetchPbTxt(path);
                    }
                }, tracker)
                    .then(function (arrayBuffer) {
                    return tf.graph.util.runTask('Parsing graph.pbtxt', 60, function () {
                        return parseGraphPbTxt(arrayBuffer);
                    }, tracker);
                });
            }
            parser.fetchAndParseGraphData = fetchAndParseGraphData;
            /**
             * Parse a file object in a streaming fashion line by line (or custom delim).
             * Can handle very large files.
             * @param input The file object as an array buffer.
             * @param callback The callback called on each line
             * @param chunkSize The size of each read chunk. (optional)
             * @param delim The delimiter used to split a line. (optional)
             * @returns A promise for when it is finished.
             */
            function streamParse(arrayBuffer, callback, chunkSize, delim) {
                if (chunkSize === void 0) { chunkSize = 1000000; }
                if (delim === void 0) { delim = '\n'; }
                return new Promise(function (resolve, reject) {
                    var offset = 0;
                    var bufferSize = arrayBuffer.byteLength - 1;
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
                            resolve(true);
                            return;
                        }
                        readChunk(offset, chunkSize);
                    }
                    function readChunk(offset, size) {
                        var arrayBufferChunk = arrayBuffer.slice(offset, offset + size);
                        var blob = new Blob([arrayBufferChunk]);
                        var file = new FileReader();
                        file.onload = function (e) { return readHandler(e.target.result); };
                        file.readAsText(blob);
                    }
                    readChunk(offset, chunkSize);
                });
            }
            parser.streamParse = streamParse;
            /**
             * Since proto-txt doesn't explicitly say whether an attribute is repeated
             * (an array) or not, we keep a hard-coded list of attributes that are known
             * to be repeated. This list is used in parsing time to convert repeated
             * attributes into arrays even when the attribute only shows up once in the
             * object.
             */
            var GRAPH_REPEATED_FIELDS = {
                'library.function': true,
                'library.function.node_def': true,
                'library.function.signature.input_arg': true,
                'library.function.signature.output_arg': true,
                'library.versions': true,
                'node': true,
                'node.input': true,
                'node.attr': true,
                'node.attr.value.list.type': true,
                'node.attr.value.shape.dim': true,
                'node.attr.value.tensor.string_val': true,
                'node.attr.value.tensor.tensor_shape.dim': true,
                'node.attr.value.list.shape': true,
                'node.attr.value.list.shape.dim': true,
                'node.attr.value.list.s': true
            };
            var METADATA_REPEATED_FIELDS = {
                'step_stats.dev_stats': true,
                'step_stats.dev_stats.node_stats': true,
                'step_stats.dev_stats.node_stats.output': true,
                'step_stats.dev_stats.node_stats.memory': true,
                'step_stats.dev_stats.node_stats.output.tensor_description.shape.dim': true
            };
            /**
             * Parses an ArrayBuffer of a proto txt file into a raw Graph object.
             */
            function parseGraphPbTxt(input) {
                return parsePbtxtFile(input, GRAPH_REPEATED_FIELDS);
            }
            parser.parseGraphPbTxt = parseGraphPbTxt;
            /**
             * Parses an ArrayBuffer of a proto txt file into a StepStats object.
             */
            function parseStatsPbTxt(input) {
                return parsePbtxtFile(input, METADATA_REPEATED_FIELDS)
                    .then(function (obj) { return obj['step_stats']; });
            }
            parser.parseStatsPbTxt = parseStatsPbTxt;
            /**
             * Parses a ArrayBuffer of a proto txt file into javascript object.
             *
             * @param input The ArrayBuffer or file object implementing slice.
             * @param repeatedFields Map (Set) of all the repeated fields, since you can't
             *   tell directly from the pbtxt if a field is repeated or not.
             * @returns The parsed object.
             */
            function parsePbtxtFile(input, repeatedFields) {
                var output = {};
                var stack = [];
                var path = [];
                var current = output;
                function splitNameAndValueInAttribute(line) {
                    var colonIndex = line.indexOf(':');
                    var name = line.substring(0, colonIndex).trim();
                    var value = parseValue(line.substring(colonIndex + 2).trim());
                    return {
                        name: name,
                        value: value
                    };
                }
                /**
                 * Adds a value, given the attribute name and the host object. If the
                 * attribute already exists, but is not an array, it will convert it to an
                 * array of values.
                 *
                 * @param obj The host object that holds the attribute.
                 * @param name The attribute name (key).
                 * @param value The attribute value.
                 * @param path A path that identifies the attribute. Used to check if
                 *     an attribute is an array or not.
                 */
                function addAttribute(obj, name, value, path) {
                    // We treat 'node' specially since it is done so often.
                    var existingValue = obj[name];
                    if (existingValue == null) {
                        obj[name] = path.join('.') in repeatedFields ? [value] : value;
                    }
                    else if (Array.isArray(existingValue)) {
                        existingValue.push(value);
                    }
                    else {
                        obj[name] = [existingValue, value];
                    }
                }
                // Run through the file a line at a time.
                return streamParse(input, function (line) {
                    if (!line) {
                        return;
                    }
                    line = line.trim();
                    switch (line[line.length - 1]) {
                        case '{': // create new object
                            var name_1 = line.substring(0, line.length - 2).trim();
                            var newValue = {};
                            stack.push(current);
                            path.push(name_1);
                            addAttribute(current, name_1, newValue, path);
                            current = newValue;
                            break;
                        case '}':
                            current = stack.pop();
                            path.pop();
                            break;
                        default:
                            var x = splitNameAndValueInAttribute(line);
                            addAttribute(current, x.name, x.value, path.concat(x.name));
                            break;
                    }
                }).then(function () {
                    return output;
                });
            }
        })(parser = graph.parser || (graph.parser = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // Close module tf.graph.parser.
