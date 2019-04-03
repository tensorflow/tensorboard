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
    var util;
    (function (util) {
        /**
         * Delay for running expensive tasks, in milliseconds.
         * The duration was empirically found so that it leaves enough time for the
         * browser to update its UI state before starting an expensive UI-blocking task.
         */
        var TASK_DELAY_MS = 200;
        /** Shuffles the array in-place in O(n) time using Fisher-Yates algorithm. */
        function shuffle(array) {
            var m = array.length;
            var t;
            var i;
            // While there remain elements to shuffle.
            while (m) {
                // Pick a remaining element
                i = Math.floor(Math.random() * m--);
                // And swap it with the current element.
                t = array[m];
                array[m] = array[i];
                array[i] = t;
            }
            return array;
        }
        util.shuffle = shuffle;
        function range(count) {
            var rangeOutput = [];
            for (var i = 0; i < count; i++) {
                rangeOutput.push(i);
            }
            return rangeOutput;
        }
        util.range = range;
        function classed(element, className, enabled) {
            var classNames = element.className.split(' ');
            if (enabled) {
                if (className in classNames) {
                    return;
                }
                else {
                    classNames.push(className);
                }
            }
            else {
                var index = classNames.indexOf(className);
                if (index === -1) {
                    return;
                }
                classNames.splice(index, 1);
            }
            element.className = classNames.join(' ');
        }
        util.classed = classed;
        /** Projects a 3d point into screen space */
        function vector3DToScreenCoords(cam, w, h, v) {
            var dpr = window.devicePixelRatio;
            var pv = new THREE.Vector3().copy(v).project(cam);
            // The screen-space origin is at the middle of the screen, with +y up.
            var coords = [((pv.x + 1) / 2 * w) * dpr, -((pv.y - 1) / 2 * h) * dpr];
            return coords;
        }
        util.vector3DToScreenCoords = vector3DToScreenCoords;
        /** Loads 3 contiguous elements from a packed xyz array into a Vector3. */
        function vector3FromPackedArray(a, pointIndex) {
            var offset = pointIndex * 3;
            return new THREE.Vector3(a[offset], a[offset + 1], a[offset + 2]);
        }
        util.vector3FromPackedArray = vector3FromPackedArray;
        /**
         * Gets the camera-space z coordinates of the nearest and farthest points.
         * Ignores points that are behind the camera.
         */
        function getNearFarPoints(worldSpacePoints, cameraPos, cameraTarget) {
            var shortestDist = Infinity;
            var furthestDist = 0;
            var camToTarget = new THREE.Vector3().copy(cameraTarget).sub(cameraPos);
            var camPlaneNormal = new THREE.Vector3().copy(camToTarget).normalize();
            var n = worldSpacePoints.length / 3;
            var src = 0;
            var p = new THREE.Vector3();
            var camToPoint = new THREE.Vector3();
            for (var i = 0; i < n; i++) {
                p.x = worldSpacePoints[src];
                p.y = worldSpacePoints[src + 1];
                p.z = worldSpacePoints[src + 2];
                src += 3;
                camToPoint.copy(p).sub(cameraPos);
                var dist = camPlaneNormal.dot(camToPoint);
                if (dist < 0) {
                    continue;
                }
                furthestDist = (dist > furthestDist) ? dist : furthestDist;
                shortestDist = (dist < shortestDist) ? dist : shortestDist;
            }
            return [shortestDist, furthestDist];
        }
        util.getNearFarPoints = getNearFarPoints;
        /**
         * Generate a texture for the points/images and sets some initial params
         */
        function createTexture(image) {
            var tex = new THREE.Texture(image);
            tex.needsUpdate = true;
            // Used if the texture isn't a power of 2.
            tex.minFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            tex.flipY = false;
            return tex;
        }
        util.createTexture = createTexture;
        /**
         * Assert that the condition is satisfied; if not, log user-specified message
         * to the console.
         */
        function assert(condition, message) {
            if (!condition) {
                message = message || 'Assertion failed';
                throw new Error(message);
            }
        }
        util.assert = assert;
        function getSearchPredicate(query, inRegexMode, fieldName) {
            var predicate;
            if (inRegexMode) {
                var regExp_1 = new RegExp(query, 'i');
                predicate = function (p) { return regExp_1.test(p.metadata[fieldName].toString()); };
            }
            else {
                // Doing a case insensitive substring match.
                query = query.toLowerCase();
                predicate = function (p) {
                    var label = p.metadata[fieldName].toString().toLowerCase();
                    return label.indexOf(query) >= 0;
                };
            }
            return predicate;
        }
        util.getSearchPredicate = getSearchPredicate;
        /**
         * Runs an expensive task asynchronously with some delay
         * so that it doesn't block the UI thread immediately.
         *
         * @param message The message to display to the user.
         * @param task The expensive task to run.
         * @param msgId Optional. ID of an existing message. If provided, will overwrite
         *     an existing message and won't automatically clear the message when the
         *     task is done.
         * @return The value returned by the task.
         */
        function runAsyncTask(message, task, msgId) {
            if (msgId === void 0) { msgId = null; }
            var autoClear = (msgId == null);
            msgId = vz_projector.logging.setModalMessage(message, msgId);
            return new Promise(function (resolve, reject) {
                setTimeout(function () {
                    try {
                        var result = task();
                        // Clearing the old message.
                        if (autoClear) {
                            vz_projector.logging.setModalMessage(null, msgId);
                        }
                        resolve(result);
                    }
                    catch (ex) {
                        reject(ex);
                    }
                    return true;
                }, TASK_DELAY_MS);
            });
        }
        util.runAsyncTask = runAsyncTask;
        /**
         * Parses the URL for query parameters, e.g. ?foo=1&bar=2 will return
         *   {'foo': '1', 'bar': '2'}.
         * @param url The URL to parse.
         * @return A map of queryParam key to its value.
         */
        function getURLParams(url) {
            if (!url) {
                return {};
            }
            var queryString = url.indexOf('?') !== -1 ? url.split('?')[1] : url;
            if (queryString.indexOf('#')) {
                queryString = queryString.split('#')[0];
            }
            var queryEntries = queryString.split('&');
            var queryParams = {};
            for (var i = 0; i < queryEntries.length; i++) {
                var queryEntryComponents = queryEntries[i].split('=');
                queryParams[queryEntryComponents[0].toLowerCase()] =
                    decodeURIComponent(queryEntryComponents[1]);
            }
            return queryParams;
        }
        util.getURLParams = getURLParams;
        /** List of substrings that auto generated tensors have in their name. */
        var SUBSTR_GEN_TENSORS = ['/Adagrad'];
        /** Returns true if the tensor was automatically generated by TF API calls. */
        function tensorIsGenerated(tensorName) {
            for (var i = 0; i < SUBSTR_GEN_TENSORS.length; i++) {
                if (tensorName.indexOf(SUBSTR_GEN_TENSORS[i]) >= 0) {
                    return true;
                }
            }
            return false;
        }
        util.tensorIsGenerated = tensorIsGenerated;
        function xor(cond1, cond2) {
            return (cond1 || cond2) && !(cond1 && cond2);
        }
        util.xor = xor;
        /** Checks to see if the browser supports webgl. */
        function hasWebGLSupport() {
            try {
                var c = document.createElement('canvas');
                var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
                return gl != null && typeof weblas !== 'undefined';
            }
            catch (e) {
                return false;
            }
        }
        util.hasWebGLSupport = hasWebGLSupport;
    })(util = vz_projector.util || (vz_projector.util = {}));
})(vz_projector || (vz_projector = {})); // namespace vz_projector.util
