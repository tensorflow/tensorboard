/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
namespace tf.graph.icon {
  export enum GraphIconType {
    CONST = 'CONST',
    META = 'META',
    OP = 'OP',
    SERIES = 'SERIES',
    SUMMARY = 'SUMMARY',
  }

  Polymer({
    is: 'tf-graph-icon',

    properties: {
      /**
       * Type of node to draw.
       * @param {GraphIconType}
       */
      type: String,

      /** Direction for series. */
      vertical: {
        type: Boolean,
        value: false,
      },

      /**
       * Fill for the icon, optional. If fill is specified and node is not
       * specified, then this value will override the default for the
       * element. However, if node is specified, this value will be ignored.
       */
      fillOverride: {
        type: String,
        value: null,
      },

      strokeOverride: {
        type: String,
        value: null,
      },

      /** Height of the SVG element in pixels, used for scaling. */
      height: {
        type: Number,
        value: 20,
      },

      faded: {
        type: Boolean,
        value: false,
      },

      _fill: {
        type: String,
        computed: '_computeFill(type, fillOverride)',
      },

      _stroke: {
        type: String,
        computed: '_computeStroke(type, strokeOverride)',
      },
    },

    getSvgDefinableElement(): HTMLElement {
      return this.$.svgDefs;
    },

    _computeFill(type: GraphIconType, fillOverride: string): string {
      if (fillOverride != null) return fillOverride;
      switch (type) {
        case GraphIconType.META:
          return tf.graph.render.MetanodeColors.DEFAULT_FILL;
        case GraphIconType.SERIES:
          return tf.graph.render.SeriesNodeColors.DEFAULT_FILL;
        default:
          return tf.graph.render.OpNodeColors.DEFAULT_FILL;
      }
    },

    /**
     * Get the stroke value for the element, or if that's not possible,
     * return the default stroke value for the node type.
     */
    _computeStroke(type: GraphIconType, strokeOverride): string {
      if (strokeOverride != null) return strokeOverride;
      switch (type) {
        case GraphIconType.META:
          return tf.graph.render.MetanodeColors.DEFAULT_STROKE;
        case GraphIconType.SERIES:
          return tf.graph.render.SeriesNodeColors.DEFAULT_STROKE;
        default:
          return tf.graph.render.OpNodeColors.DEFAULT_STROKE;
      }
    },

    /**
     * Test whether the specified node's type, or the literal type string,
     * match a particular other type.
     */
    _isType(type: GraphIconType, targetType: GraphIconType): boolean {
      return type === targetType;
    },

    _fadedClass: function(faded: boolean, shape: string): string {
      return faded ? 'faded-' + shape : '';
    },
  });
}
