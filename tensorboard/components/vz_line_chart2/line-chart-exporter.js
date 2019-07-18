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
    let NodeName;
    (function (NodeName) {
        NodeName["GROUP"] = "G";
        NodeName["DIV"] = "DIV";
        NodeName["SVG"] = "SVG";
        NodeName["TEXT"] = "TEXT";
    })(NodeName || (NodeName = {}));
    class PlottableExporter {
        constructor(rootEl) {
            this.uniqueId = 0;
            this.root = rootEl;
        }
        exportAsString() {
            const convertedNodes = this.convert(this.root);
            if (!convertedNodes)
                return '';
            const svg = this.createRootSvg();
            svg.appendChild(convertedNodes);
            return svg.outerHTML;
        }
        createUniqueId(prefix) {
            return `${prefix}_${this.uniqueId++}`;
        }
        getSize() {
            return this.root.getBoundingClientRect();
        }
        createRootSvg() {
            const svg = document.createElement('svg');
            const rect = this.getSize();
            // case on `viewBox` is sensitive.
            svg.setAttributeNS('svg', 'viewBox', `0 0 ${rect.width} ${rect.height}`);
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            return svg;
        }
        convert(node) {
            let newNode = null;
            const nodeName = node.nodeName.toUpperCase();
            if (node.nodeType == Node.ELEMENT_NODE &&
                (nodeName == NodeName.DIV || nodeName == NodeName.SVG)) {
                newNode = document.createElement(NodeName.GROUP);
                const style = window.getComputedStyle(node);
                const left = parseInt(style.left, 10);
                const top = parseInt(style.top, 10);
                if (left || top) {
                    const clipId = this.createUniqueId('clip');
                    newNode.setAttribute('transform', `translate(${left}, ${top})`);
                    newNode.setAttribute('clip-path', `url(#${clipId})`);
                    const width = parseInt(style.width, 10);
                    const height = parseInt(style.height, 10);
                    const rect = document.createElement('rect');
                    rect.setAttribute('width', String(width));
                    rect.setAttribute('height', String(height));
                    const clipPath = document.createElementNS('svg', 'clipPath');
                    clipPath.id = clipId;
                    clipPath.appendChild(rect);
                    newNode.appendChild(clipPath);
                }
            }
            else {
                newNode = node.cloneNode();
            }
            Array.from(node.childNodes)
                .map(node => this.convert(node))
                .filter(Boolean)
                .forEach(el => newNode.appendChild(el));
            // Remove empty grouping. They add too much noise.
            const shouldOmit = (newNode.nodeName.toUpperCase() == NodeName.GROUP &&
                !newNode.hasChildNodes()) || this.shouldOmitNode(node);
            if (shouldOmit)
                return null;
            return this.stripClass(this.transferStyle(node, newNode));
        }
        stripClass(node) {
            if (node.nodeType == Node.ELEMENT_NODE) {
                node.removeAttribute('class');
            }
            return node;
        }
        transferStyle(origNode, node) {
            if (node.nodeType != Node.ELEMENT_NODE)
                return node;
            const el = node;
            const nodeName = node.nodeName.toUpperCase();
            const style = window.getComputedStyle(origNode);
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
        }
        shouldOmitNode(node) {
            return false;
        }
    }
    vz_line_chart2.PlottableExporter = PlottableExporter;
    class LineChartExporter extends PlottableExporter {
        shouldOmitNode(node) {
            // Scatter plot is useful for tooltip. Tooltip is meaningless in the
            // exported svg.
            if (node.nodeType == Node.ELEMENT_NODE) {
                return node.classList.contains('scatter-plot');
            }
            return false;
        }
    }
    vz_line_chart2.LineChartExporter = LineChartExporter;
})(vz_line_chart2 || (vz_line_chart2 = {}));
