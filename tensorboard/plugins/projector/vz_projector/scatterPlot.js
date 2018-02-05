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
    var BACKGROUND_COLOR = 0xffffff;
    /**
     * The length of the cube (diameter of the circumscribing sphere) where all the
     * points live.
     */
    var CUBE_LENGTH = 2;
    var MAX_ZOOM = 5 * CUBE_LENGTH;
    var MIN_ZOOM = 0.025 * CUBE_LENGTH;
    // Constants relating to the camera parameters.
    var PERSP_CAMERA_FOV_VERTICAL = 70;
    var PERSP_CAMERA_NEAR_CLIP_PLANE = 0.01;
    var PERSP_CAMERA_FAR_CLIP_PLANE = 100;
    var ORTHO_CAMERA_FRUSTUM_HALF_EXTENT = 1.2;
    // Key presses.
    var SHIFT_KEY = 16;
    var CTRL_KEY = 17;
    var START_CAMERA_POS_3D = new THREE.Vector3(0.45, 0.9, 1.6);
    var START_CAMERA_TARGET_3D = new THREE.Vector3(0, 0, 0);
    var START_CAMERA_POS_2D = new THREE.Vector3(0, 0, 4);
    var START_CAMERA_TARGET_2D = new THREE.Vector3(0, 0, 0);
    var ORBIT_MOUSE_ROTATION_SPEED = 1;
    var ORBIT_ANIMATION_ROTATION_CYCLE_IN_SECONDS = 7;
    /** Supported modes of interaction. */
    var MouseMode;
    (function (MouseMode) {
        MouseMode[MouseMode["AREA_SELECT"] = 0] = "AREA_SELECT";
        MouseMode[MouseMode["CAMERA_AND_CLICK_SELECT"] = 1] = "CAMERA_AND_CLICK_SELECT";
    })(MouseMode = vz_projector.MouseMode || (vz_projector.MouseMode = {}));
    /** Defines a camera, suitable for serialization. */
    var CameraDef = /** @class */ (function () {
        function CameraDef() {
            this.orthographic = false;
        }
        return CameraDef;
    }());
    vz_projector.CameraDef = CameraDef;
    /**
     * Maintains a three.js instantiation and context,
     * animation state, and all other logic that's
     * independent of how a 3D scatter plot is actually rendered. Also holds an
     * array of visualizers and dispatches application events to them.
     */
    var ScatterPlot = /** @class */ (function () {
        function ScatterPlot(container, projectorEventContext) {
            var _this = this;
            this.container = container;
            this.projectorEventContext = projectorEventContext;
            this.visualizers = [];
            this.onCameraMoveListeners = [];
            this.backgroundColor = BACKGROUND_COLOR;
            this.dimensionality = 3;
            this.cameraDef = null;
            this.orbitAnimationOnNextCameraCreation = false;
            this.selecting = false;
            this.mouseIsDown = false;
            this.isDragSequence = false;
            this.getLayoutValues();
            this.scene = new THREE.Scene();
            this.renderer = new THREE.WebGLRenderer({ alpha: true, premultipliedAlpha: false, antialias: false });
            this.renderer.setClearColor(BACKGROUND_COLOR, 1);
            this.container.appendChild(this.renderer.domElement);
            this.light = new THREE.PointLight(0xFFECBF, 1, 0);
            this.scene.add(this.light);
            this.setDimensions(3);
            this.recreateCamera(this.makeDefaultCameraDef(this.dimensionality));
            this.renderer.render(this.scene, this.camera);
            this.rectangleSelector = new vz_projector.ScatterPlotRectangleSelector(this.container, function (boundingBox) { return _this.selectBoundingBox(boundingBox); });
            this.addInteractionListeners();
        }
        ScatterPlot.prototype.addInteractionListeners = function () {
            this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
            this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
            this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.container.addEventListener('click', this.onClick.bind(this));
            window.addEventListener('keydown', this.onKeyDown.bind(this), false);
            window.addEventListener('keyup', this.onKeyUp.bind(this), false);
        };
        ScatterPlot.prototype.addCameraControlsEventListeners = function (cameraControls) {
            var _this = this;
            // Start is called when the user stars interacting with
            // controls.
            cameraControls.addEventListener('start', function () {
                _this.stopOrbitAnimation();
                _this.onCameraMoveListeners.forEach(function (l) { return l(_this.camera.position, cameraControls.target); });
            });
            // Change is called everytime the user interacts with the controls.
            cameraControls.addEventListener('change', function () {
                _this.render();
            });
            // End is called when the user stops interacting with the
            // controls (e.g. on mouse up, after dragging).
            cameraControls.addEventListener('end', function () { });
        };
        ScatterPlot.prototype.makeOrbitControls = function (camera, cameraDef, cameraIs3D) {
            if (this.orbitCameraControls != null) {
                this.orbitCameraControls.dispose();
            }
            var occ = new THREE.OrbitControls(camera, this.renderer.domElement);
            occ.target0 = new THREE.Vector3(cameraDef.target[0], cameraDef.target[1], cameraDef.target[2]);
            occ.position0 = new THREE.Vector3().copy(camera.position);
            occ.zoom0 = cameraDef.zoom;
            occ.enableRotate = cameraIs3D;
            occ.autoRotate = false;
            occ.rotateSpeed = ORBIT_MOUSE_ROTATION_SPEED;
            if (cameraIs3D) {
                occ.mouseButtons.ORBIT = THREE.MOUSE.LEFT;
                occ.mouseButtons.PAN = THREE.MOUSE.RIGHT;
            }
            else {
                occ.mouseButtons.ORBIT = null;
                occ.mouseButtons.PAN = THREE.MOUSE.LEFT;
            }
            occ.reset();
            this.camera = camera;
            this.orbitCameraControls = occ;
            this.addCameraControlsEventListeners(this.orbitCameraControls);
        };
        ScatterPlot.prototype.makeCamera3D = function (cameraDef, w, h) {
            var camera;
            {
                var aspectRatio = w / h;
                camera = new THREE.PerspectiveCamera(PERSP_CAMERA_FOV_VERTICAL, aspectRatio, PERSP_CAMERA_NEAR_CLIP_PLANE, PERSP_CAMERA_FAR_CLIP_PLANE);
                camera.position.set(cameraDef.position[0], cameraDef.position[1], cameraDef.position[2]);
                var at = new THREE.Vector3(cameraDef.target[0], cameraDef.target[1], cameraDef.target[2]);
                camera.lookAt(at);
                camera.zoom = cameraDef.zoom;
                camera.updateProjectionMatrix();
            }
            this.camera = camera;
            this.makeOrbitControls(camera, cameraDef, true);
        };
        ScatterPlot.prototype.makeCamera2D = function (cameraDef, w, h) {
            var camera;
            var target = new THREE.Vector3(cameraDef.target[0], cameraDef.target[1], cameraDef.target[2]);
            {
                var aspectRatio = w / h;
                var left = -ORTHO_CAMERA_FRUSTUM_HALF_EXTENT;
                var right = ORTHO_CAMERA_FRUSTUM_HALF_EXTENT;
                var bottom = -ORTHO_CAMERA_FRUSTUM_HALF_EXTENT;
                var top_1 = ORTHO_CAMERA_FRUSTUM_HALF_EXTENT;
                // Scale up the larger of (w, h) to match the aspect ratio.
                if (aspectRatio > 1) {
                    left *= aspectRatio;
                    right *= aspectRatio;
                }
                else {
                    top_1 /= aspectRatio;
                    bottom /= aspectRatio;
                }
                camera =
                    new THREE.OrthographicCamera(left, right, top_1, bottom, -1000, 1000);
                camera.position.set(cameraDef.position[0], cameraDef.position[1], cameraDef.position[2]);
                camera.up = new THREE.Vector3(0, 1, 0);
                camera.lookAt(target);
                camera.zoom = cameraDef.zoom;
                camera.updateProjectionMatrix();
            }
            this.camera = camera;
            this.makeOrbitControls(camera, cameraDef, false);
        };
        ScatterPlot.prototype.makeDefaultCameraDef = function (dimensionality) {
            var def = new CameraDef();
            def.orthographic = (dimensionality === 2);
            def.zoom = 1.0;
            if (def.orthographic) {
                def.position =
                    [START_CAMERA_POS_2D.x, START_CAMERA_POS_2D.y, START_CAMERA_POS_2D.z];
                def.target = [
                    START_CAMERA_TARGET_2D.x, START_CAMERA_TARGET_2D.y,
                    START_CAMERA_TARGET_2D.z
                ];
            }
            else {
                def.position =
                    [START_CAMERA_POS_3D.x, START_CAMERA_POS_3D.y, START_CAMERA_POS_3D.z];
                def.target = [
                    START_CAMERA_TARGET_3D.x, START_CAMERA_TARGET_3D.y,
                    START_CAMERA_TARGET_3D.z
                ];
            }
            return def;
        };
        /** Recreate the scatter plot camera from a definition structure. */
        ScatterPlot.prototype.recreateCamera = function (cameraDef) {
            if (cameraDef.orthographic) {
                this.makeCamera2D(cameraDef, this.width, this.height);
            }
            else {
                this.makeCamera3D(cameraDef, this.width, this.height);
            }
            this.orbitCameraControls.minDistance = MIN_ZOOM;
            this.orbitCameraControls.maxDistance = MAX_ZOOM;
            this.orbitCameraControls.update();
            if (this.orbitAnimationOnNextCameraCreation) {
                this.startOrbitAnimation();
            }
        };
        ScatterPlot.prototype.onClick = function (e, notify) {
            if (notify === void 0) { notify = true; }
            if (e && this.selecting) {
                return;
            }
            // Only call event handlers if the click originated from the scatter plot.
            if (!this.isDragSequence && notify) {
                var selection = (this.nearestPoint != null) ? [this.nearestPoint] : [];
                this.projectorEventContext.notifySelectionChanged(selection);
            }
            this.isDragSequence = false;
            this.render();
        };
        ScatterPlot.prototype.onMouseDown = function (e) {
            this.isDragSequence = false;
            this.mouseIsDown = true;
            if (this.selecting) {
                this.orbitCameraControls.enabled = false;
                this.rectangleSelector.onMouseDown(e.offsetX, e.offsetY);
                this.setNearestPointToMouse(e);
            }
            else if (!e.ctrlKey && this.sceneIs3D() &&
                this.orbitCameraControls.mouseButtons.ORBIT === THREE.MOUSE.RIGHT) {
                // The user happened to press the ctrl key when the tab was active,
                // unpressed the ctrl when the tab was inactive, and now he/she
                // is back to the projector tab.
                this.orbitCameraControls.mouseButtons.ORBIT = THREE.MOUSE.LEFT;
                this.orbitCameraControls.mouseButtons.PAN = THREE.MOUSE.RIGHT;
            }
            else if (e.ctrlKey && this.sceneIs3D() &&
                this.orbitCameraControls.mouseButtons.ORBIT === THREE.MOUSE.LEFT) {
                // Similarly to the situation above.
                this.orbitCameraControls.mouseButtons.ORBIT = THREE.MOUSE.RIGHT;
                this.orbitCameraControls.mouseButtons.PAN = THREE.MOUSE.LEFT;
            }
        };
        /** When we stop dragging/zooming, return to normal behavior. */
        ScatterPlot.prototype.onMouseUp = function (e) {
            if (this.selecting) {
                this.orbitCameraControls.enabled = true;
                this.rectangleSelector.onMouseUp();
                this.render();
            }
            this.mouseIsDown = false;
        };
        /**
         * When the mouse moves, find the nearest point (if any) and send it to the
         * hoverlisteners (usually called from embedding.ts)
         */
        ScatterPlot.prototype.onMouseMove = function (e) {
            this.isDragSequence = this.mouseIsDown;
            // Depending if we're selecting or just navigating, handle accordingly.
            if (this.selecting && this.mouseIsDown) {
                this.rectangleSelector.onMouseMove(e.offsetX, e.offsetY);
                this.render();
            }
            else if (!this.mouseIsDown) {
                this.setNearestPointToMouse(e);
                this.projectorEventContext.notifyHoverOverPoint(this.nearestPoint);
            }
        };
        /** For using ctrl + left click as right click, and for circle select */
        ScatterPlot.prototype.onKeyDown = function (e) {
            // If ctrl is pressed, use left click to orbit
            if (e.keyCode === CTRL_KEY && this.sceneIs3D()) {
                this.orbitCameraControls.mouseButtons.ORBIT = THREE.MOUSE.RIGHT;
                this.orbitCameraControls.mouseButtons.PAN = THREE.MOUSE.LEFT;
            }
            // If shift is pressed, start selecting
            if (e.keyCode === SHIFT_KEY) {
                this.selecting = true;
                this.container.style.cursor = 'crosshair';
            }
        };
        /** For using ctrl + left click as right click, and for circle select */
        ScatterPlot.prototype.onKeyUp = function (e) {
            if (e.keyCode === CTRL_KEY && this.sceneIs3D()) {
                this.orbitCameraControls.mouseButtons.ORBIT = THREE.MOUSE.LEFT;
                this.orbitCameraControls.mouseButtons.PAN = THREE.MOUSE.RIGHT;
            }
            // If shift is released, stop selecting
            if (e.keyCode === SHIFT_KEY) {
                this.selecting = (this.getMouseMode() === MouseMode.AREA_SELECT);
                if (!this.selecting) {
                    this.container.style.cursor = 'default';
                }
                this.render();
            }
        };
        /**
         * Returns a list of indices of points in a bounding box from the picking
         * texture.
         * @param boundingBox The bounding box to select from.
         */
        ScatterPlot.prototype.getPointIndicesFromPickingTexture = function (boundingBox) {
            if (this.worldSpacePointPositions == null) {
                return null;
            }
            var pointCount = this.worldSpacePointPositions.length / 3;
            var dpr = window.devicePixelRatio || 1;
            var x = Math.floor(boundingBox.x * dpr);
            var y = Math.floor(boundingBox.y * dpr);
            var width = Math.floor(boundingBox.width * dpr);
            var height = Math.floor(boundingBox.height * dpr);
            // Create buffer for reading all of the pixels from the texture.
            var pixelBuffer = new Uint8Array(width * height * 4);
            // Read the pixels from the bounding box.
            this.renderer.readRenderTargetPixels(this.pickingTexture, x, this.pickingTexture.height - y, width, height, pixelBuffer);
            // Keep a flat list of each point and whether they are selected or not. This
            // approach is more efficient than using an object keyed by the index.
            var pointIndicesSelection = new Uint8Array(this.worldSpacePointPositions.length);
            for (var i = 0; i < width * height; i++) {
                var id = (pixelBuffer[i * 4] << 16) | (pixelBuffer[i * 4 + 1] << 8) |
                    pixelBuffer[i * 4 + 2];
                if (id !== 0xffffff && (id < pointCount)) {
                    pointIndicesSelection[id] = 1;
                }
            }
            var pointIndices = [];
            for (var i = 0; i < pointIndicesSelection.length; i++) {
                if (pointIndicesSelection[i] === 1) {
                    pointIndices.push(i);
                }
            }
            return pointIndices;
        };
        ScatterPlot.prototype.selectBoundingBox = function (boundingBox) {
            var pointIndices = this.getPointIndicesFromPickingTexture(boundingBox);
            this.projectorEventContext.notifySelectionChanged(pointIndices);
        };
        ScatterPlot.prototype.setNearestPointToMouse = function (e) {
            if (this.pickingTexture == null) {
                this.nearestPoint = null;
                return;
            }
            var boundingBox = { x: e.offsetX, y: e.offsetY, width: 1, height: 1 };
            var pointIndices = this.getPointIndicesFromPickingTexture(boundingBox);
            this.nearestPoint = (pointIndices != null) ? pointIndices[0] : null;
        };
        ScatterPlot.prototype.getLayoutValues = function () {
            this.width = this.container.offsetWidth;
            this.height = Math.max(1, this.container.offsetHeight);
            return [this.width, this.height];
        };
        ScatterPlot.prototype.sceneIs3D = function () {
            return this.dimensionality === 3;
        };
        ScatterPlot.prototype.remove3dAxisFromScene = function () {
            var axes = this.scene.getObjectByName('axes');
            if (axes != null) {
                this.scene.remove(axes);
            }
            return axes;
        };
        ScatterPlot.prototype.add3dAxis = function () {
            var axes = new THREE.AxisHelper();
            axes.name = 'axes';
            this.scene.add(axes);
        };
        /** Set 2d vs 3d mode. */
        ScatterPlot.prototype.setDimensions = function (dimensionality) {
            if ((dimensionality !== 2) && (dimensionality !== 3)) {
                throw new RangeError('dimensionality must be 2 or 3');
            }
            this.dimensionality = dimensionality;
            var def = this.cameraDef || this.makeDefaultCameraDef(dimensionality);
            this.recreateCamera(def);
            this.remove3dAxisFromScene();
            if (dimensionality === 3) {
                this.add3dAxis();
            }
        };
        /** Gets the current camera information, suitable for serialization. */
        ScatterPlot.prototype.getCameraDef = function () {
            var def = new CameraDef();
            var pos = this.camera.position;
            var tgt = this.orbitCameraControls.target;
            def.orthographic = !this.sceneIs3D();
            def.position = [pos.x, pos.y, pos.z];
            def.target = [tgt.x, tgt.y, tgt.z];
            def.zoom = this.camera.zoom;
            return def;
        };
        /** Sets parameters for the next camera recreation. */
        ScatterPlot.prototype.setCameraParametersForNextCameraCreation = function (def, orbitAnimation) {
            this.cameraDef = def;
            this.orbitAnimationOnNextCameraCreation = orbitAnimation;
        };
        /** Gets the current camera position. */
        ScatterPlot.prototype.getCameraPosition = function () {
            var currPos = this.camera.position;
            return [currPos.x, currPos.y, currPos.z];
        };
        /** Gets the current camera target. */
        ScatterPlot.prototype.getCameraTarget = function () {
            var currTarget = this.orbitCameraControls.target;
            return [currTarget.x, currTarget.y, currTarget.z];
        };
        /** Sets up the camera from given position and target coordinates. */
        ScatterPlot.prototype.setCameraPositionAndTarget = function (position, target) {
            this.stopOrbitAnimation();
            this.camera.position.set(position[0], position[1], position[2]);
            this.orbitCameraControls.target.set(target[0], target[1], target[2]);
            this.orbitCameraControls.update();
            this.render();
        };
        /** Starts orbiting the camera around its current lookat target. */
        ScatterPlot.prototype.startOrbitAnimation = function () {
            if (!this.sceneIs3D()) {
                return;
            }
            if (this.orbitAnimationId != null) {
                this.stopOrbitAnimation();
            }
            this.orbitCameraControls.autoRotate = true;
            this.orbitCameraControls.rotateSpeed =
                ORBIT_ANIMATION_ROTATION_CYCLE_IN_SECONDS;
            this.updateOrbitAnimation();
        };
        ScatterPlot.prototype.updateOrbitAnimation = function () {
            var _this = this;
            this.orbitCameraControls.update();
            this.orbitAnimationId =
                requestAnimationFrame(function () { return _this.updateOrbitAnimation(); });
        };
        /** Stops the orbiting animation on the camera. */
        ScatterPlot.prototype.stopOrbitAnimation = function () {
            this.orbitCameraControls.autoRotate = false;
            this.orbitCameraControls.rotateSpeed = ORBIT_MOUSE_ROTATION_SPEED;
            if (this.orbitAnimationId != null) {
                cancelAnimationFrame(this.orbitAnimationId);
                this.orbitAnimationId = null;
            }
        };
        /** Adds a visualizer to the set, will start dispatching events to it */
        ScatterPlot.prototype.addVisualizer = function (visualizer) {
            if (this.scene) {
                visualizer.setScene(this.scene);
            }
            visualizer.onResize(this.width, this.height);
            visualizer.onPointPositionsChanged(this.worldSpacePointPositions);
            this.visualizers.push(visualizer);
        };
        /** Removes all visualizers attached to this scatter plot. */
        ScatterPlot.prototype.removeAllVisualizers = function () {
            this.visualizers.forEach(function (v) { return v.dispose(); });
            this.visualizers = [];
        };
        /** Update scatter plot with a new array of packed xyz point positions. */
        ScatterPlot.prototype.setPointPositions = function (worldSpacePointPositions) {
            this.worldSpacePointPositions = worldSpacePointPositions;
            this.visualizers.forEach(function (v) { return v.onPointPositionsChanged(worldSpacePointPositions); });
        };
        ScatterPlot.prototype.render = function () {
            {
                var lightPos = this.camera.position.clone();
                lightPos.x += 1;
                lightPos.y += 1;
                this.light.position.set(lightPos.x, lightPos.y, lightPos.z);
            }
            var cameraType = (this.camera instanceof THREE.PerspectiveCamera) ?
                vz_projector.CameraType.Perspective :
                vz_projector.CameraType.Orthographic;
            var cameraSpacePointExtents = [0, 0];
            if (this.worldSpacePointPositions != null) {
                cameraSpacePointExtents = vz_projector.util.getNearFarPoints(this.worldSpacePointPositions, this.camera.position, this.orbitCameraControls.target);
            }
            var rc = new vz_projector.RenderContext(this.camera, cameraType, this.orbitCameraControls.target, this.width, this.height, cameraSpacePointExtents[0], cameraSpacePointExtents[1], this.backgroundColor, this.pointColors, this.pointScaleFactors, this.labels, this.polylineColors, this.polylineOpacities, this.polylineWidths);
            // Render first pass to picking target. This render fills pickingTexture
            // with colors that are actually point ids, so that sampling the texture at
            // the mouse's current x,y coordinates will reveal the data point that the
            // mouse is over.
            this.visualizers.forEach(function (v) { return v.onPickingRender(rc); });
            {
                var axes = this.remove3dAxisFromScene();
                this.renderer.render(this.scene, this.camera, this.pickingTexture);
                if (axes != null) {
                    this.scene.add(axes);
                }
            }
            // Render second pass to color buffer, to be displayed on the canvas.
            this.visualizers.forEach(function (v) { return v.onRender(rc); });
            this.renderer.render(this.scene, this.camera);
        };
        ScatterPlot.prototype.setMouseMode = function (mouseMode) {
            this.mouseMode = mouseMode;
            if (mouseMode === MouseMode.AREA_SELECT) {
                this.selecting = true;
                this.container.style.cursor = 'crosshair';
            }
            else {
                this.selecting = false;
                this.container.style.cursor = 'default';
            }
        };
        /** Set the colors for every data point. (RGB triplets) */
        ScatterPlot.prototype.setPointColors = function (colors) {
            this.pointColors = colors;
        };
        /** Set the scale factors for every data point. (scalars) */
        ScatterPlot.prototype.setPointScaleFactors = function (scaleFactors) {
            this.pointScaleFactors = scaleFactors;
        };
        /** Set the labels to rendered */
        ScatterPlot.prototype.setLabels = function (labels) {
            this.labels = labels;
        };
        /** Set the colors for every data polyline. (RGB triplets) */
        ScatterPlot.prototype.setPolylineColors = function (colors) {
            this.polylineColors = colors;
        };
        ScatterPlot.prototype.setPolylineOpacities = function (opacities) {
            this.polylineOpacities = opacities;
        };
        ScatterPlot.prototype.setPolylineWidths = function (widths) {
            this.polylineWidths = widths;
        };
        ScatterPlot.prototype.getMouseMode = function () {
            return this.mouseMode;
        };
        ScatterPlot.prototype.resetZoom = function () {
            this.recreateCamera(this.makeDefaultCameraDef(this.dimensionality));
            this.render();
        };
        ScatterPlot.prototype.setDayNightMode = function (isNight) {
            var canvases = this.container.querySelectorAll('canvas');
            var filterValue = isNight ? 'invert(100%)' : null;
            for (var i = 0; i < canvases.length; i++) {
                canvases[i].style.filter = filterValue;
            }
        };
        ScatterPlot.prototype.resize = function (render) {
            if (render === void 0) { render = true; }
            var _a = [this.width, this.height], oldW = _a[0], oldH = _a[1];
            var _b = this.getLayoutValues(), newW = _b[0], newH = _b[1];
            if (this.dimensionality === 3) {
                var camera = this.camera;
                camera.aspect = newW / newH;
                camera.updateProjectionMatrix();
            }
            else {
                var camera = this.camera;
                // Scale the ortho frustum by however much the window changed.
                var scaleW = newW / oldW;
                var scaleH = newH / oldH;
                var newCamHalfWidth = ((camera.right - camera.left) * scaleW) / 2;
                var newCamHalfHeight = ((camera.top - camera.bottom) * scaleH) / 2;
                camera.top = newCamHalfHeight;
                camera.bottom = -newCamHalfHeight;
                camera.left = -newCamHalfWidth;
                camera.right = newCamHalfWidth;
                camera.updateProjectionMatrix();
            }
            // Accouting for retina displays.
            var dpr = window.devicePixelRatio || 1;
            this.renderer.setPixelRatio(dpr);
            this.renderer.setSize(newW, newH);
            // the picking texture needs to be exactly the same as the render texture.
            {
                var renderCanvasSize = this.renderer.getSize();
                var pixelRatio = this.renderer.getPixelRatio();
                this.pickingTexture = new THREE.WebGLRenderTarget(renderCanvasSize.width * pixelRatio, renderCanvasSize.height * pixelRatio);
                this.pickingTexture.texture.minFilter = THREE.LinearFilter;
            }
            this.visualizers.forEach(function (v) { return v.onResize(newW, newH); });
            if (render) {
                this.render();
            }
            ;
        };
        ScatterPlot.prototype.onCameraMove = function (listener) {
            this.onCameraMoveListeners.push(listener);
        };
        ScatterPlot.prototype.clickOnPoint = function (pointIndex) {
            this.nearestPoint = pointIndex;
            this.onClick(null, false);
        };
        return ScatterPlot;
    }());
    vz_projector.ScatterPlot = ScatterPlot;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
