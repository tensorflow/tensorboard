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
    var NUM_POINTS_FOG_THRESHOLD = 5000;
    var MIN_POINT_SIZE = 5.0;
    var IMAGE_SIZE = 30;
    // Constants relating to the indices of buffer arrays.
    var RGB_NUM_ELEMENTS = 3;
    var INDEX_NUM_ELEMENTS = 1;
    var XYZ_NUM_ELEMENTS = 3;
    var VERTEX_SHADER = "\n  // Index of the specific vertex (passed in as bufferAttribute), and the\n  // variable that will be used to pass it to the fragment shader.\n  attribute float spriteIndex;\n  attribute vec3 color;\n  attribute float scaleFactor;\n\n  varying vec2 xyIndex;\n  varying vec3 vColor;\n\n  uniform bool sizeAttenuation;\n  uniform float pointSize;\n  uniform float spritesPerRow;\n  uniform float spritesPerColumn;\n\n  void main() {\n    // Pass index and color values to fragment shader.\n    vColor = color;\n    xyIndex = vec2(mod(spriteIndex, spritesPerRow),\n              floor(spriteIndex / spritesPerColumn));\n\n    // Transform current vertex by modelViewMatrix (model world position and\n    // camera world position matrix).\n    vec4 cameraSpacePos = modelViewMatrix * vec4(position, 1.0);\n\n    // Project vertex in camera-space to screen coordinates using the camera's\n    // projection matrix.\n    gl_Position = projectionMatrix * cameraSpacePos;\n\n    // Create size attenuation (if we're in 3D mode) by making the size of\n    // each point inversly proportional to its distance to the camera.\n    float outputPointSize = pointSize;\n    if (sizeAttenuation) {\n      outputPointSize = -pointSize / cameraSpacePos.z;\n    } else {  // Create size attenuation (if we're in 2D mode)\n      const float PI = 3.1415926535897932384626433832795;\n      const float minScale = 0.1;  // minimum scaling factor\n      const float outSpeed = 2.0;  // shrink speed when zooming out\n      const float outNorm = (1. - minScale) / atan(outSpeed);\n      const float maxScale = 15.0;  // maximum scaling factor\n      const float inSpeed = 0.02;  // enlarge speed when zooming in\n      const float zoomOffset = 0.3;  // offset zoom pivot\n      float zoom = projectionMatrix[0][0] + zoomOffset;  // zoom pivot\n      float scale = zoom < 1. ? 1. + outNorm * atan(outSpeed * (zoom - 1.)) :\n                    1. + 2. / PI * (maxScale - 1.) * atan(inSpeed * (zoom - 1.));\n      outputPointSize = pointSize * scale;\n    }\n\n    gl_PointSize =\n      max(outputPointSize * scaleFactor, " + MIN_POINT_SIZE.toFixed(1) + ");\n  }";
    var FRAGMENT_SHADER_POINT_TEST_CHUNK = "\n  bool point_in_unit_circle(vec2 spriteCoord) {\n    vec2 centerToP = spriteCoord - vec2(0.5, 0.5);\n    return dot(centerToP, centerToP) < (0.5 * 0.5);\n  }\n\n  bool point_in_unit_equilateral_triangle(vec2 spriteCoord) {\n    vec3 v0 = vec3(0, 1, 0);\n    vec3 v1 = vec3(0.5, 0, 0);\n    vec3 v2 = vec3(1, 1, 0);\n    vec3 p = vec3(spriteCoord, 0);\n    float p_in_v0_v1 = cross(v1 - v0, p - v0).z;\n    float p_in_v1_v2 = cross(v2 - v1, p - v1).z;\n    return (p_in_v0_v1 > 0.0) && (p_in_v1_v2 > 0.0);\n  }\n\n  bool point_in_unit_square(vec2 spriteCoord) {\n    return true;\n  }\n";
    var FRAGMENT_SHADER = "\n  varying vec2 xyIndex;\n  varying vec3 vColor;\n\n  uniform sampler2D texture;\n  uniform float spritesPerRow;\n  uniform float spritesPerColumn;\n  uniform bool isImage;\n\n  " + THREE.ShaderChunk['common'] + "\n  " + THREE.ShaderChunk['fog_pars_fragment'] + "\n  " + FRAGMENT_SHADER_POINT_TEST_CHUNK + "\n\n  void main() {\n    if (isImage) {\n      // Coordinates of the vertex within the entire sprite image.\n      vec2 coords =\n        (gl_PointCoord + xyIndex) / vec2(spritesPerRow, spritesPerColumn);\n      gl_FragColor = vec4(vColor, 1.0) * texture2D(texture, coords);\n    } else {\n      bool inside = point_in_unit_circle(gl_PointCoord);\n      if (!inside) {\n        discard;\n      }\n      gl_FragColor = vec4(vColor, 1);\n    }\n    " + THREE.ShaderChunk['fog_fragment'] + "\n  }";
    var FRAGMENT_SHADER_PICKING = "\n  varying vec2 xyIndex;\n  varying vec3 vColor;\n  uniform bool isImage;\n\n  " + FRAGMENT_SHADER_POINT_TEST_CHUNK + "\n\n  void main() {\n    xyIndex; // Silence 'unused variable' warning.\n    if (isImage) {\n      gl_FragColor = vec4(vColor, 1);\n    } else {\n      bool inside = point_in_unit_circle(gl_PointCoord);\n      if (!inside) {\n        discard;\n      }\n      gl_FragColor = vec4(vColor, 1);\n    }\n  }";
    /**
     * Uses GL point sprites to render the dataset.
     */
    var ScatterPlotVisualizerSprites = /** @class */ (function () {
        function ScatterPlotVisualizerSprites() {
            this.texture = null;
            this.standinTextureForPoints =
                vz_projector.util.createTexture(document.createElement('canvas'));
            this.renderMaterial = this.createRenderMaterial(false);
            this.pickingMaterial = this.createPickingMaterial(false);
        }
        ScatterPlotVisualizerSprites.prototype.createTextureFromSpriteAtlas = function (spriteAtlas, spriteDimensions, spriteIndices) {
            this.texture = vz_projector.util.createTexture(spriteAtlas);
            this.spritesPerRow = spriteAtlas.width / spriteDimensions[0];
            this.spritesPerColumn = spriteAtlas.height / spriteDimensions[1];
            this.spriteDimensions = spriteDimensions;
            this.spriteIndexBufferAttribute =
                new THREE.BufferAttribute(spriteIndices, INDEX_NUM_ELEMENTS);
            if (this.points != null) {
                this.points.geometry
                    .addAttribute('spriteIndex', this.spriteIndexBufferAttribute);
            }
        };
        ScatterPlotVisualizerSprites.prototype.createUniforms = function () {
            return {
                texture: { type: 't' },
                spritesPerRow: { type: 'f' },
                spritesPerColumn: { type: 'f' },
                fogColor: { type: 'c' },
                fogNear: { type: 'f' },
                fogFar: { type: 'f' },
                isImage: { type: 'bool' },
                sizeAttenuation: { type: 'bool' },
                pointSize: { type: 'f' }
            };
        };
        ScatterPlotVisualizerSprites.prototype.createRenderMaterial = function (haveImage) {
            var uniforms = this.createUniforms();
            return new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: VERTEX_SHADER,
                fragmentShader: FRAGMENT_SHADER,
                transparent: !haveImage,
                depthTest: haveImage,
                depthWrite: haveImage,
                fog: true,
                blending: THREE.MultiplyBlending,
            });
        };
        ScatterPlotVisualizerSprites.prototype.createPickingMaterial = function (haveImage) {
            var uniforms = this.createUniforms();
            return new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: VERTEX_SHADER,
                fragmentShader: FRAGMENT_SHADER_PICKING,
                transparent: true,
                depthTest: true,
                depthWrite: true,
                fog: false,
                blending: THREE.NormalBlending,
            });
        };
        /**
         * Create points, set their locations and actually instantiate the
         * geometry.
         */
        ScatterPlotVisualizerSprites.prototype.createPointSprites = function (scene, positions) {
            var pointCount = (positions != null) ? (positions.length / XYZ_NUM_ELEMENTS) : 0;
            var geometry = this.createGeometry(pointCount);
            this.fog = new THREE.Fog(0xFFFFFF); // unused value, gets overwritten.
            this.points = new THREE.Points(geometry, this.renderMaterial);
            this.points.frustumCulled = false;
            if (this.spriteIndexBufferAttribute != null) {
                this.points.geometry
                    .addAttribute('spriteIndex', this.spriteIndexBufferAttribute);
            }
            scene.add(this.points);
        };
        ScatterPlotVisualizerSprites.prototype.calculatePointSize = function (sceneIs3D) {
            if (this.texture != null) {
                return sceneIs3D ? IMAGE_SIZE : this.spriteDimensions[0];
            }
            var n = (this.worldSpacePointPositions != null) ?
                (this.worldSpacePointPositions.length / XYZ_NUM_ELEMENTS) :
                1;
            var SCALE = 200;
            var LOG_BASE = 8;
            var DIVISOR = 1.5;
            // Scale point size inverse-logarithmically to the number of points.
            var pointSize = SCALE / Math.log(n) / Math.log(LOG_BASE);
            return sceneIs3D ? pointSize : (pointSize / DIVISOR);
        };
        /**
         * Set up buffer attributes to be used for the points/images.
         */
        ScatterPlotVisualizerSprites.prototype.createGeometry = function (pointCount) {
            var n = pointCount;
            // Fill pickingColors with each point's unique id as its color.
            this.pickingColors = new Float32Array(n * RGB_NUM_ELEMENTS);
            {
                var dst = 0;
                for (var i = 0; i < n; i++) {
                    var c = new THREE.Color(i);
                    this.pickingColors[dst++] = c.r;
                    this.pickingColors[dst++] = c.g;
                    this.pickingColors[dst++] = c.b;
                }
            }
            var geometry = new THREE.BufferGeometry();
            geometry.addAttribute('position', new THREE.BufferAttribute(null, XYZ_NUM_ELEMENTS));
            geometry.addAttribute('color', new THREE.BufferAttribute(null, RGB_NUM_ELEMENTS));
            geometry.addAttribute('scaleFactor', new THREE.BufferAttribute(null, INDEX_NUM_ELEMENTS));
            return geometry;
        };
        ScatterPlotVisualizerSprites.prototype.setFogDistances = function (sceneIs3D, nearestPointZ, farthestPointZ) {
            if (sceneIs3D) {
                var n = this.worldSpacePointPositions.length / XYZ_NUM_ELEMENTS;
                this.fog.near = nearestPointZ;
                // If there are fewer points we want less fog. We do this
                // by making the "far" value (that is, the distance from the camera to the
                // far edge of the fog) proportional to the number of points.
                var multiplier = 2 - Math.min(n, NUM_POINTS_FOG_THRESHOLD) / NUM_POINTS_FOG_THRESHOLD;
                this.fog.far = farthestPointZ * multiplier;
            }
            else {
                this.fog.near = Infinity;
                this.fog.far = Infinity;
            }
        };
        ScatterPlotVisualizerSprites.prototype.dispose = function () {
            this.disposeGeometry();
            this.disposeTextureAtlas();
        };
        ScatterPlotVisualizerSprites.prototype.disposeGeometry = function () {
            if (this.points != null) {
                this.scene.remove(this.points);
                this.points.geometry.dispose();
                this.points = null;
                this.worldSpacePointPositions = null;
            }
        };
        ScatterPlotVisualizerSprites.prototype.disposeTextureAtlas = function () {
            if (this.texture != null) {
                this.texture.dispose();
            }
            this.texture = null;
            this.renderMaterial = null;
            this.pickingMaterial = null;
        };
        ScatterPlotVisualizerSprites.prototype.setScene = function (scene) {
            this.scene = scene;
        };
        ScatterPlotVisualizerSprites.prototype.setSpriteAtlas = function (spriteImage, spriteDimensions, spriteIndices) {
            this.disposeTextureAtlas();
            this.createTextureFromSpriteAtlas(spriteImage, spriteDimensions, spriteIndices);
            this.renderMaterial = this.createRenderMaterial(true);
            this.pickingMaterial = this.createPickingMaterial(true);
        };
        ScatterPlotVisualizerSprites.prototype.clearSpriteAtlas = function () {
            this.disposeTextureAtlas();
            this.renderMaterial = this.createRenderMaterial(false);
            this.pickingMaterial = this.createPickingMaterial(false);
        };
        ScatterPlotVisualizerSprites.prototype.onPointPositionsChanged = function (newPositions) {
            if ((newPositions == null) || (newPositions.length === 0)) {
                this.dispose();
                return;
            }
            if (this.points != null) {
                if (this.worldSpacePointPositions.length !== newPositions.length) {
                    this.disposeGeometry();
                }
            }
            this.worldSpacePointPositions = newPositions;
            if (this.points == null) {
                this.createPointSprites(this.scene, newPositions);
            }
            var positions = this.points.geometry
                .getAttribute('position');
            positions.array = newPositions;
            positions.needsUpdate = true;
        };
        ScatterPlotVisualizerSprites.prototype.onPickingRender = function (rc) {
            if (this.points == null) {
                return;
            }
            var sceneIs3D = (rc.cameraType === vz_projector.CameraType.Perspective);
            this.pickingMaterial.uniforms.spritesPerRow.value = this.spritesPerRow;
            this.pickingMaterial.uniforms.spritesPerRow.value = this.spritesPerColumn;
            this.pickingMaterial.uniforms.sizeAttenuation.value = sceneIs3D;
            this.pickingMaterial.uniforms.pointSize.value =
                this.calculatePointSize(sceneIs3D);
            this.points.material = this.pickingMaterial;
            var colors = this.points.geometry
                .getAttribute('color');
            colors.array = this.pickingColors;
            colors.needsUpdate = true;
            var scaleFactors = this.points.geometry
                .getAttribute('scaleFactor');
            scaleFactors.array = rc.pointScaleFactors;
            scaleFactors.needsUpdate = true;
        };
        ScatterPlotVisualizerSprites.prototype.onRender = function (rc) {
            if (!this.points) {
                return;
            }
            var sceneIs3D = (rc.camera instanceof THREE.PerspectiveCamera);
            this.setFogDistances(sceneIs3D, rc.nearestCameraSpacePointZ, rc.farthestCameraSpacePointZ);
            this.scene.fog = this.fog;
            this.scene.fog.color = new THREE.Color(rc.backgroundColor);
            this.renderMaterial.uniforms.fogColor.value = this.scene.fog.color;
            this.renderMaterial.uniforms.fogNear.value = this.fog.near;
            this.renderMaterial.uniforms.fogFar.value = this.fog.far;
            this.renderMaterial.uniforms.spritesPerRow.value = this.spritesPerRow;
            this.renderMaterial.uniforms.spritesPerColumn.value = this.spritesPerColumn;
            this.renderMaterial.uniforms.isImage.value = (this.texture != null);
            this.renderMaterial.uniforms.texture.value =
                (this.texture != null) ? this.texture : this.standinTextureForPoints;
            this.renderMaterial.uniforms.sizeAttenuation.value = sceneIs3D;
            this.renderMaterial.uniforms.pointSize.value =
                this.calculatePointSize(sceneIs3D);
            this.points.material = this.renderMaterial;
            var colors = this.points.geometry
                .getAttribute('color');
            this.renderColors = rc.pointColors;
            colors.array = this.renderColors;
            colors.needsUpdate = true;
            var scaleFactors = this.points.geometry
                .getAttribute('scaleFactor');
            scaleFactors.array = rc.pointScaleFactors;
            scaleFactors.needsUpdate = true;
        };
        ScatterPlotVisualizerSprites.prototype.onResize = function (newWidth, newHeight) { };
        return ScatterPlotVisualizerSprites;
    }());
    vz_projector.ScatterPlotVisualizerSprites = ScatterPlotVisualizerSprites;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
