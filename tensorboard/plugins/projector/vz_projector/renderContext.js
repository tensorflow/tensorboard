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
    /**
     * LabelRenderParams describes the set of points that should have labels
     * rendered next to them.
     */
    var LabelRenderParams = /** @class */ (function () {
        function LabelRenderParams(pointIndices, labelStrings, scaleFactors, useSceneOpacityFlags, defaultFontSize, fillColors, strokeColors) {
            this.pointIndices = pointIndices;
            this.labelStrings = labelStrings;
            this.scaleFactors = scaleFactors;
            this.useSceneOpacityFlags = useSceneOpacityFlags;
            this.defaultFontSize = defaultFontSize;
            this.fillColors = fillColors;
            this.strokeColors = strokeColors;
        }
        return LabelRenderParams;
    }());
    vz_projector.LabelRenderParams = LabelRenderParams;
    /** Details about the camera projection being used to render the scene. */
    var CameraType;
    (function (CameraType) {
        CameraType[CameraType["Perspective"] = 0] = "Perspective";
        CameraType[CameraType["Orthographic"] = 1] = "Orthographic";
    })(CameraType = vz_projector.CameraType || (vz_projector.CameraType = {}));
    /**
     * RenderContext contains all of the state required to color and render the data
     * set. ScatterPlot passes this to every attached visualizer as part of the
     * render callback.
     * TODO(@charlesnicholson): This should only contain the data that's changed between
     * each frame. Data like colors / scale factors / labels should be reapplied
     * only when they change.
     */
    var RenderContext = /** @class */ (function () {
        function RenderContext(camera, cameraType, cameraTarget, screenWidth, screenHeight, nearestCameraSpacePointZ, farthestCameraSpacePointZ, backgroundColor, pointColors, pointScaleFactors, labels, polylineColors, polylineOpacities, polylineWidths) {
            this.camera = camera;
            this.cameraType = cameraType;
            this.cameraTarget = cameraTarget;
            this.screenWidth = screenWidth;
            this.screenHeight = screenHeight;
            this.nearestCameraSpacePointZ = nearestCameraSpacePointZ;
            this.farthestCameraSpacePointZ = farthestCameraSpacePointZ;
            this.backgroundColor = backgroundColor;
            this.pointColors = pointColors;
            this.pointScaleFactors = pointScaleFactors;
            this.labels = labels;
            this.polylineColors = polylineColors;
            this.polylineOpacities = polylineOpacities;
            this.polylineWidths = polylineWidths;
        }
        return RenderContext;
    }());
    vz_projector.RenderContext = RenderContext;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
