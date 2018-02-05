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
    var FONT_SIZE = 80;
    var ONE_OVER_FONT_SIZE = 1 / FONT_SIZE;
    var LABEL_SCALE = 2.2; // at 1:1 texel/pixel ratio
    var LABEL_COLOR = 'black';
    var LABEL_BACKGROUND = 'white';
    var MAX_CANVAS_DIMENSION = 8192;
    var NUM_GLYPHS = 256;
    var RGB_ELEMENTS_PER_ENTRY = 3;
    var XYZ_ELEMENTS_PER_ENTRY = 3;
    var UV_ELEMENTS_PER_ENTRY = 2;
    var VERTICES_PER_GLYPH = 2 * 3; // 2 triangles, 3 verts per triangle
    /**
     * Each label is made up of triangles (two per letter.) Each vertex, then, is
     * the corner of one of these triangles (and thus the corner of a letter
     * rectangle.)
     * Each has the following attributes:
     *    posObj: The (x, y) position of the vertex within the label, where the
     *            bottom center of the word is positioned at (0, 0);
     *    position: The position of the label in worldspace.
     *    vUv: The (u, v) coordinates that index into the glyphs sheet (range 0, 1.)
     *    color: The color of the label (matches the corresponding point's color.)
     *    wordShown: Boolean. Whether or not the label is visible.
     */
    var VERTEX_SHADER = "\n    attribute vec2 posObj;\n    attribute vec3 color;\n    varying vec2 vUv;\n    varying vec3 vColor;\n\n    void main() {\n      vUv = uv;\n      vColor = color;\n\n      // Rotate label to face camera.\n\n      vec4 vRight = vec4(\n        modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0], 0);\n\n      vec4 vUp = vec4(\n        modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix[2][1], 0);\n\n      vec4 vAt = -vec4(\n        modelViewMatrix[0][2], modelViewMatrix[1][2], modelViewMatrix[2][2], 0);\n\n      mat4 pointToCamera = mat4(vRight, vUp, vAt, vec4(0, 0, 0, 1));\n\n      vec2 scaledPos = posObj * " + ONE_OVER_FONT_SIZE + " * " + LABEL_SCALE + ";\n\n      vec4 posRotated = pointToCamera * vec4(scaledPos, 0, 1);\n      vec4 mvPosition = modelViewMatrix * (vec4(position, 0) + posRotated);\n      gl_Position = projectionMatrix * mvPosition;\n    }";
    var FRAGMENT_SHADER = "\n    uniform sampler2D texture;\n    uniform bool picking;\n    varying vec2 vUv;\n    varying vec3 vColor;\n\n    void main() {\n      if (picking) {\n        gl_FragColor = vec4(vColor, 1.0);\n      } else {\n        vec4 fromTexture = texture2D(texture, vUv);\n        gl_FragColor = vec4(vColor, 1.0) * fromTexture;\n      }\n    }";
    /**
     * Renders the text labels as 3d geometry in the world.
     */
    var ScatterPlotVisualizer3DLabels = /** @class */ (function () {
        function ScatterPlotVisualizer3DLabels() {
        }
        ScatterPlotVisualizer3DLabels.prototype.createGlyphTexture = function () {
            var canvas = document.createElement('canvas');
            canvas.width = MAX_CANVAS_DIMENSION;
            canvas.height = FONT_SIZE;
            var ctx = canvas.getContext('2d');
            ctx.font = 'bold ' + FONT_SIZE * 0.75 + 'px roboto';
            ctx.textBaseline = 'top';
            ctx.fillStyle = LABEL_BACKGROUND;
            ctx.rect(0, 0, canvas.width, canvas.height);
            ctx.fill();
            ctx.fillStyle = LABEL_COLOR;
            var spaceOffset = ctx.measureText(' ').width;
            // For each letter, store length, position at the encoded index.
            var glyphLengths = new Float32Array(NUM_GLYPHS);
            var glyphOffset = new Float32Array(NUM_GLYPHS);
            var leftCoord = 0;
            for (var i = 0; i < NUM_GLYPHS; i++) {
                var text = ' ' + String.fromCharCode(i);
                var textLength = ctx.measureText(text).width;
                glyphLengths[i] = textLength - spaceOffset;
                glyphOffset[i] = leftCoord;
                ctx.fillText(text, leftCoord - spaceOffset, 0);
                leftCoord += textLength;
            }
            var tex = vz_projector.util.createTexture(canvas);
            return { texture: tex, lengths: glyphLengths, offsets: glyphOffset };
        };
        ScatterPlotVisualizer3DLabels.prototype.processLabelVerts = function (pointCount) {
            var numTotalLetters = 0;
            this.labelVertexMap = [];
            for (var i = 0; i < pointCount; i++) {
                var label = this.labelStrings[i];
                var vertsArray = [];
                for (var j = 0; j < label.length; j++) {
                    for (var k = 0; k < VERTICES_PER_GLYPH; k++) {
                        vertsArray.push(numTotalLetters * VERTICES_PER_GLYPH + k);
                    }
                    numTotalLetters++;
                }
                this.labelVertexMap.push(vertsArray);
            }
            this.totalVertexCount = numTotalLetters * VERTICES_PER_GLYPH;
        };
        ScatterPlotVisualizer3DLabels.prototype.createColorBuffers = function (pointCount) {
            var _this = this;
            this.pickingColors =
                new Float32Array(this.totalVertexCount * RGB_ELEMENTS_PER_ENTRY);
            this.renderColors =
                new Float32Array(this.totalVertexCount * RGB_ELEMENTS_PER_ENTRY);
            var _loop_1 = function (i) {
                var color = new THREE.Color(i);
                this_1.labelVertexMap[i].forEach(function (j) {
                    _this.pickingColors[RGB_ELEMENTS_PER_ENTRY * j] = color.r;
                    _this.pickingColors[RGB_ELEMENTS_PER_ENTRY * j + 1] = color.g;
                    _this.pickingColors[RGB_ELEMENTS_PER_ENTRY * j + 2] = color.b;
                    _this.renderColors[RGB_ELEMENTS_PER_ENTRY * j] = 1.0;
                    _this.renderColors[RGB_ELEMENTS_PER_ENTRY * j + 1] = 1.0;
                    _this.renderColors[RGB_ELEMENTS_PER_ENTRY * j + 2] = 1.0;
                });
            };
            var this_1 = this;
            for (var i = 0; i < pointCount; i++) {
                _loop_1(i);
            }
        };
        ScatterPlotVisualizer3DLabels.prototype.createLabels = function () {
            var _this = this;
            if ((this.labelStrings == null) ||
                (this.worldSpacePointPositions == null)) {
                return;
            }
            var pointCount = this.worldSpacePointPositions.length / XYZ_ELEMENTS_PER_ENTRY;
            if (pointCount !== this.labelStrings.length) {
                return;
            }
            this.glyphTexture = this.createGlyphTexture();
            this.uniforms = {
                texture: { type: 't' },
                picking: { type: 'bool' },
            };
            this.material = new THREE.ShaderMaterial({
                uniforms: this.uniforms,
                transparent: true,
                vertexShader: VERTEX_SHADER,
                fragmentShader: FRAGMENT_SHADER,
            });
            this.processLabelVerts(pointCount);
            this.createColorBuffers(pointCount);
            var positionArray = new Float32Array(this.totalVertexCount * XYZ_ELEMENTS_PER_ENTRY);
            this.positions =
                new THREE.BufferAttribute(positionArray, XYZ_ELEMENTS_PER_ENTRY);
            var posArray = new Float32Array(this.totalVertexCount * XYZ_ELEMENTS_PER_ENTRY);
            var uvArray = new Float32Array(this.totalVertexCount * UV_ELEMENTS_PER_ENTRY);
            var colorsArray = new Float32Array(this.totalVertexCount * RGB_ELEMENTS_PER_ENTRY);
            var positionObject = new THREE.BufferAttribute(posArray, 2);
            var uv = new THREE.BufferAttribute(uvArray, UV_ELEMENTS_PER_ENTRY);
            var colors = new THREE.BufferAttribute(colorsArray, RGB_ELEMENTS_PER_ENTRY);
            this.geometry = new THREE.BufferGeometry();
            this.geometry.addAttribute('posObj', positionObject);
            this.geometry.addAttribute('position', this.positions);
            this.geometry.addAttribute('uv', uv);
            this.geometry.addAttribute('color', colors);
            var lettersSoFar = 0;
            for (var i = 0; i < pointCount; i++) {
                var label = this.labelStrings[i];
                var leftOffset = 0;
                // Determine length of word in pixels.
                for (var j = 0; j < label.length; j++) {
                    var letterCode = label.charCodeAt(j);
                    leftOffset += this.glyphTexture.lengths[letterCode];
                }
                leftOffset /= -2; // centers text horizontally around the origin
                for (var j = 0; j < label.length; j++) {
                    var letterCode = label.charCodeAt(j);
                    var letterWidth = this.glyphTexture.lengths[letterCode];
                    var scale = FONT_SIZE;
                    var right = (leftOffset + letterWidth) / scale;
                    var left = (leftOffset) / scale;
                    var top_1 = FONT_SIZE / scale;
                    // First triangle
                    positionObject.setXY(lettersSoFar * VERTICES_PER_GLYPH + 0, left, 0);
                    positionObject.setXY(lettersSoFar * VERTICES_PER_GLYPH + 1, right, 0);
                    positionObject.setXY(lettersSoFar * VERTICES_PER_GLYPH + 2, left, top_1);
                    // Second triangle
                    positionObject.setXY(lettersSoFar * VERTICES_PER_GLYPH + 3, left, top_1);
                    positionObject.setXY(lettersSoFar * VERTICES_PER_GLYPH + 4, right, 0);
                    positionObject.setXY(lettersSoFar * VERTICES_PER_GLYPH + 5, right, top_1);
                    // Set UVs based on letter.
                    var uLeft = (this.glyphTexture.offsets[letterCode]);
                    var uRight = (this.glyphTexture.offsets[letterCode] + letterWidth);
                    // Scale so that uvs lie between 0 and 1 on the texture.
                    uLeft /= MAX_CANVAS_DIMENSION;
                    uRight /= MAX_CANVAS_DIMENSION;
                    var vTop = 1;
                    var vBottom = 0;
                    uv.setXY(lettersSoFar * VERTICES_PER_GLYPH + 0, uLeft, vTop);
                    uv.setXY(lettersSoFar * VERTICES_PER_GLYPH + 1, uRight, vTop);
                    uv.setXY(lettersSoFar * VERTICES_PER_GLYPH + 2, uLeft, vBottom);
                    uv.setXY(lettersSoFar * VERTICES_PER_GLYPH + 3, uLeft, vBottom);
                    uv.setXY(lettersSoFar * VERTICES_PER_GLYPH + 4, uRight, vTop);
                    uv.setXY(lettersSoFar * VERTICES_PER_GLYPH + 5, uRight, vBottom);
                    lettersSoFar++;
                    leftOffset += letterWidth;
                }
            }
            var _loop_2 = function (i) {
                var p = vz_projector.util.vector3FromPackedArray(this_2.worldSpacePointPositions, i);
                this_2.labelVertexMap[i].forEach(function (j) {
                    _this.positions.setXYZ(j, p.x, p.y, p.z);
                });
            };
            var this_2 = this;
            for (var i = 0; i < pointCount; i++) {
                _loop_2(i);
            }
            ;
            this.labelsMesh = new THREE.Mesh(this.geometry, this.material);
            this.labelsMesh.frustumCulled = false;
            this.scene.add(this.labelsMesh);
        };
        ScatterPlotVisualizer3DLabels.prototype.colorLabels = function (pointColors) {
            if (this.labelStrings == null || this.geometry == null ||
                pointColors == null) {
                return;
            }
            var colors = this.geometry.getAttribute('color');
            colors.array = this.renderColors;
            var n = pointColors.length / XYZ_ELEMENTS_PER_ENTRY;
            var src = 0;
            for (var i = 0; i < n; ++i) {
                var c = new THREE.Color(pointColors[src], pointColors[src + 1], pointColors[src + 2]);
                var m = this.labelVertexMap[i].length;
                for (var j = 0; j < m; ++j) {
                    colors.setXYZ(this.labelVertexMap[i][j], c.r, c.g, c.b);
                }
                src += RGB_ELEMENTS_PER_ENTRY;
            }
            colors.needsUpdate = true;
        };
        ScatterPlotVisualizer3DLabels.prototype.setScene = function (scene) {
            this.scene = scene;
        };
        ScatterPlotVisualizer3DLabels.prototype.dispose = function () {
            if (this.labelsMesh) {
                if (this.scene) {
                    this.scene.remove(this.labelsMesh);
                }
                this.labelsMesh = null;
            }
            if (this.geometry) {
                this.geometry.dispose();
                this.geometry = null;
            }
            if ((this.glyphTexture != null) && (this.glyphTexture.texture != null)) {
                this.glyphTexture.texture.dispose();
                this.glyphTexture.texture = null;
            }
        };
        ScatterPlotVisualizer3DLabels.prototype.onPickingRender = function (rc) {
            if (this.geometry == null) {
                this.createLabels();
            }
            if (this.geometry == null) {
                return;
            }
            this.material.uniforms.texture.value = this.glyphTexture.texture;
            this.material.uniforms.picking.value = true;
            var colors = this.geometry.getAttribute('color');
            colors.array = this.pickingColors;
            colors.needsUpdate = true;
        };
        ScatterPlotVisualizer3DLabels.prototype.onRender = function (rc) {
            if (this.geometry == null) {
                this.createLabels();
            }
            if (this.geometry == null) {
                return;
            }
            this.colorLabels(rc.pointColors);
            this.material.uniforms.texture.value = this.glyphTexture.texture;
            this.material.uniforms.picking.value = false;
            var colors = this.geometry.getAttribute('color');
            colors.array = this.renderColors;
            colors.needsUpdate = true;
        };
        ScatterPlotVisualizer3DLabels.prototype.onPointPositionsChanged = function (newPositions) {
            this.worldSpacePointPositions = newPositions;
            this.dispose();
        };
        ScatterPlotVisualizer3DLabels.prototype.setLabelStrings = function (labelStrings) {
            this.labelStrings = labelStrings;
            this.dispose();
        };
        ScatterPlotVisualizer3DLabels.prototype.onResize = function (newWidth, newHeight) { };
        return ScatterPlotVisualizer3DLabels;
    }());
    vz_projector.ScatterPlotVisualizer3DLabels = ScatterPlotVisualizer3DLabels;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
