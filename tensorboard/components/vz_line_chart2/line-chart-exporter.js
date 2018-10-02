var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
var vz_line_chart2;
(function (vz_line_chart2) {
    var NodeName;
    (function (NodeName) {
        NodeName["GROUP"] = "G";
        NodeName["DIV"] = "DIV";
        NodeName["SVG"] = "SVG";
        NodeName["TEXT"] = "TEXT";
    })(NodeName || (NodeName = {}));
    var PlottableExporter = /** @class */ (function () {
        function PlottableExporter(rootEl) {
            this.uniqueId = 0;
            this.root = rootEl;
        }
        PlottableExporter.prototype.exportAsString = function () {
            var convertedNodes = this.convert(this.root);
            if (!convertedNodes)
                return '';
            var svg = this.createRootSvg();
            svg.appendChild(convertedNodes);
            return svg.outerHTML;
        };
        PlottableExporter.prototype.createUniqueId = function (prefix) {
            return prefix + "_" + this.uniqueId++;
        };
        PlottableExporter.prototype.getSize = function () {
            return this.root.getBoundingClientRect();
        };
        PlottableExporter.prototype.createRootSvg = function () {
            var svg = document.createElement('svg');
            var rect = this.getSize();
            // case on `viewBox` is sensitive.
            svg.setAttributeNS('svg', 'viewBox', "0 0 " + rect.width + " " + rect.height);
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            return svg;
        };
        PlottableExporter.prototype.convert = function (node) {
            var _this = this;
            var newNode = null;
            var nodeName = node.nodeName.toUpperCase();
            if (node.nodeType == Node.ELEMENT_NODE &&
                (nodeName == NodeName.DIV || nodeName == NodeName.SVG)) {
                newNode = document.createElement(NodeName.GROUP);
                var style = window.getComputedStyle(node);
                var left = parseInt(style.left, 10);
                var top_1 = parseInt(style.top, 10);
                if (left || top_1) {
                    var clipId = this.createUniqueId('clip');
                    newNode.setAttribute('transform', "translate(" + left + ", " + top_1 + ")");
                    newNode.setAttribute('clip-path', "url(#" + clipId + ")");
                    var width = parseInt(style.width, 10);
                    var height = parseInt(style.height, 10);
                    var rect = document.createElement('rect');
                    rect.setAttribute('width', String(width));
                    rect.setAttribute('height', String(height));
                    var clipPath = document.createElementNS('svg', 'clipPath');
                    clipPath.id = clipId;
                    clipPath.appendChild(rect);
                    newNode.appendChild(clipPath);
                }
            }
            else {
                newNode = node.cloneNode();
            }
            Array.from(node.childNodes)
                .map(function (node) { return _this.convert(node); })
                .filter(Boolean)
                .forEach(function (el) { return newNode.appendChild(el); });
            // Remove empty grouping. They add too much noise.
            var shouldOmit = (newNode.nodeName.toUpperCase() == NodeName.GROUP &&
                !newNode.hasChildNodes()) || this.shouldOmitNode(node);
            if (shouldOmit)
                return null;
            return this.stripClass(this.transferStyle(node, newNode));
        };
        PlottableExporter.prototype.stripClass = function (node) {
            if (node.nodeType == Node.ELEMENT_NODE) {
                node.removeAttribute('class');
            }
            return node;
        };
        PlottableExporter.prototype.transferStyle = function (origNode, node) {
            if (node.nodeType != Node.ELEMENT_NODE)
                return node;
            var el = node;
            var nodeName = node.nodeName.toUpperCase();
            var style = window.getComputedStyle(origNode);
            if (nodeName == NodeName.TEXT) {
                Object.assign(el.style, {
                    fontFamily: style.fontFamily,
                    fontSize: style.fontSize,
                    fontWeight: style.fontWeight,
                });
            }
            if (nodeName != NodeName.GROUP) {
                el.setAttribute('fill', style.fill);
                el.setAttribute('stroke', style.stroke);
                el.setAttribute('stroke-width', style.strokeWidth);
            }
            if (style.opacity != '1')
                el.setAttribute('opacity', style.opacity);
            return node;
        };
        PlottableExporter.prototype.shouldOmitNode = function (node) {
            return false;
        };
        return PlottableExporter;
    }());
    vz_line_chart2.PlottableExporter = PlottableExporter;
    var LineChartExporter = /** @class */ (function (_super) {
        __extends(LineChartExporter, _super);
        function LineChartExporter() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        LineChartExporter.prototype.shouldOmitNode = function (node) {
            // Scatter plot is useful for tooltip. Tooltip is meaningless in the
            // exported svg.
            if (node.nodeType == Node.ELEMENT_NODE) {
                return node.classList.contains('scatter-plot');
            }
            return false;
        };
        return LineChartExporter;
    }(PlottableExporter));
    vz_line_chart2.LineChartExporter = LineChartExporter;
})(vz_line_chart2 || (vz_line_chart2 = {}));
