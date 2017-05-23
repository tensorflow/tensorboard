package(default_visibility = ["//third_party/tensorflow:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")
load("//tensorboard:hacks.bzl", "tensorboard_typescript_bundle")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "lodash",
    srcs = ["lodash.html"],
    path = "/tf-imports",
    deps = ["@com_lodash"],
)

web_library(
    name = "threejs",
    srcs = [
        "threejs.html",
        "@org_threejs//:OrbitControls.js",
        "@org_threejs//:three.js",
    ],
    path = "/tf-imports",
)

web_library(
    name = "numericjs",
    srcs = [
        "numericjs.html",
        "@com_numericjs//:numeric.js",
    ],
    path = "/tf-imports",
)

web_library(
    name = "weblas",
    srcs = [
        "weblas.html",
        "@io_github_waylonflinn_weblas//:weblas.js",
    ],
    path = "/tf-imports",
)

web_library(
    name = "graphlib",
    srcs = [
        "graphlib.html",
        "@io_github_cpettitt_graphlib//:graphlib.core.js",
    ],
    path = "/tf-imports",
    deps = [":lodash"],
)

web_library(
    name = "dagre",
    srcs = [
        "dagre.html",
        "@io_github_cpettitt_dagre//:dagre.core.js",
    ],
    path = "/tf-imports",
    deps = [
        ":graphlib",
        ":lodash",
    ],
)

web_library(
    name = "d3",
    srcs = [
        "d3.html",
        "//third_party/javascript/d3/v4:d3.js",
    ],
    path = "/tf-imports",
)

web_library(
    name = "plottable",
    srcs = ["plottable.html"],
    path = "/tf-imports",
    deps = [
        ":d3",
        ":plottable_js_css",
    ],
)

web_library(
    name = "plottable_js_css",
    srcs = [
        "//third_party/javascript/plottable/v3:plottable.css",
        "//third_party/javascript/plottable/v3:plottable.js",
    ],
    path = "/tf-imports",
    strip_prefix = "package",
    visibility = ["//visibility:private"],
)

# Generate single TypeScript typings file for d3.js with no ES6 imports.
#
# The DefinitelyTyped definition of d3 v4 was written under the assumption that
# we want to use d3 in a modularized way. We don't want to do that because its
# import statements use NodeJS namespaces, and the Web Compiler only supports
# W3C, ECMA, and IETF standards.
tensorboard_typescript_bundle(
    name = "d3_typings",
    out = "d3.d.ts",
    namespace_srcs = {"d3": [
        "d3-transition.d.ts",
        "@org_definitelytyped_types_d3_path//:index.d.ts",
        "@org_definitelytyped_types_d3_time//:index.d.ts",
        "@org_definitelytyped_types_d3_dsv//:index.d.ts",
        "@org_definitelytyped_types_d3_color//:index.d.ts",
        "@org_definitelytyped_types_d3_selection//:index.d.ts",
        "@org_definitelytyped_types_d3_shape//:index.d.ts",
        "@org_definitelytyped_types_d3_scale//:index.d.ts",
        "@org_definitelytyped_types_d3_request//:index.d.ts",
        "@org_definitelytyped_types_d3_interpolate//:index.d.ts",
        "@org_definitelytyped_types_d3_drag//:index.d.ts",
        "@org_definitelytyped_types_d3_brush//:index.d.ts",
        "@org_definitelytyped_types_d3_axis//:index.d.ts",
        "@org_definitelytyped_types_d3_zoom//:index.d.ts",
        "@org_definitelytyped_types_d3_array//:index.d.ts",
        "@org_definitelytyped_types_d3_chord//:index.d.ts",
        "@org_definitelytyped_types_d3_collection//:index.d.ts",
        "@org_definitelytyped_types_d3_dispatch//:index.d.ts",
        "@org_definitelytyped_types_d3_ease//:index.d.ts",
        "@org_definitelytyped_types_d3_force//:index.d.ts",
        "@org_definitelytyped_types_d3_format//:index.d.ts",
        "@org_definitelytyped_types_d3_hierarchy//:index.d.ts",
        "@org_definitelytyped_types_d3_polygon//:index.d.ts",
        "@org_definitelytyped_types_d3_quadtree//:index.d.ts",
        "@org_definitelytyped_types_d3_queue//:index.d.ts",
        "@org_definitelytyped_types_d3_random//:index.d.ts",
        "@org_definitelytyped_types_d3_timer//:index.d.ts",
        "@org_definitelytyped_types_d3_voronoi//:index.d.ts",
    ]},
)

# It would be nice if Plottable released a .d.ts file for plottable.js like
# they did for previous versions.
tensorboard_typescript_bundle(
    name = "plottable_typings",
    out = "plottable.d.ts",
    namespace_srcs = {
        "Plottable": [
            "//third_party/javascript/plottable/v3:src/core/dataset.d.ts",
            "//third_party/javascript/plottable/v3:src/core/interfaces.d.ts",
            "//third_party/javascript/plottable/v3:src/core/version.d.ts",
        ],
        "Plottable.Animators": [
            "//third_party/javascript/plottable/v3:src/animators/animator.d.ts",
            "//third_party/javascript/plottable/v3:src/animators/easingAnimator.d.ts",
            "//third_party/javascript/plottable/v3:src/animators/nullAnimator.d.ts",
        ],
        "Plottable.Axes": [
            "//third_party/javascript/plottable/v3:src/axes/axis.d.ts",
            "//third_party/javascript/plottable/v3:src/axes/categoryAxis.d.ts",
            "//third_party/javascript/plottable/v3:src/axes/numericAxis.d.ts",
            "//third_party/javascript/plottable/v3:src/axes/timeAxis.d.ts",
        ],
        "Plottable.Components": [
            "//third_party/javascript/plottable/v3:src/components/component.d.ts",
            "//third_party/javascript/plottable/v3:src/components/componentContainer.d.ts",
            "//third_party/javascript/plottable/v3:src/components/dragBoxLayer.d.ts",
            "//third_party/javascript/plottable/v3:src/components/dragLineLayer.d.ts",
            "//third_party/javascript/plottable/v3:src/components/gridlines.d.ts",
            "//third_party/javascript/plottable/v3:src/components/group.d.ts",
            "//third_party/javascript/plottable/v3:src/components/guideLineLayer.d.ts",
            "//third_party/javascript/plottable/v3:src/components/interpolatedColorLegend.d.ts",
            "//third_party/javascript/plottable/v3:src/components/label.d.ts",
            "//third_party/javascript/plottable/v3:src/components/legend.d.ts",
            "//third_party/javascript/plottable/v3:src/components/plotGroup.d.ts",
            "//third_party/javascript/plottable/v3:src/components/selectionBoxLayer.d.ts",
            "//third_party/javascript/plottable/v3:src/components/table.d.ts",
            "//third_party/javascript/plottable/v3:src/components/xDragBoxLayer.d.ts",
            "//third_party/javascript/plottable/v3:src/components/yDragBoxLayer.d.ts",
        ],
        "Plottable.Configs": [
            "//third_party/javascript/plottable/v3:src/core/config.d.ts",
        ],
        "Plottable.Formatters": [
            "//third_party/javascript/plottable/v3:src/core/formatters.d.ts",
        ],
        "Plottable.RenderController": [
            "//third_party/javascript/plottable/v3:src/core/renderController.d.ts",
        ],
        "Plottable.RenderPolicies": [
            "//third_party/javascript/plottable/v3:src/core/renderPolicy.d.ts",
        ],
        "Plottable.SymbolFactories": [
            "//third_party/javascript/plottable/v3:src/core/symbolFactories.d.ts",
        ],
        "Plottable.Dispatchers": [
            "//third_party/javascript/plottable/v3:src/dispatchers/dispatcher.d.ts",
            "//third_party/javascript/plottable/v3:src/dispatchers/keyDispatcher.d.ts",
            "//third_party/javascript/plottable/v3:src/dispatchers/mouseDispatcher.d.ts",
            "//third_party/javascript/plottable/v3:src/dispatchers/touchDispatcher.d.ts",
        ],
        "Plottable.Drawers": [
            "//third_party/javascript/plottable/v3:src/drawers/arcDrawer.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/arcOutlineDrawer.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/areaDrawer.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/canvasBuffer.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/canvasDrawer.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/drawStep.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/drawer.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/lineDrawer.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/rectangleDrawer.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/segmentDrawer.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/svgDrawer.d.ts",
            "//third_party/javascript/plottable/v3:src/drawers/symbolDrawer.d.ts",
        ],
        "Plottable.Interactions": [
            "//third_party/javascript/plottable/v3:src/interactions/clickInteraction.d.ts",
            "//third_party/javascript/plottable/v3:src/interactions/dragInteraction.d.ts",
            "//third_party/javascript/plottable/v3:src/interactions/interaction.d.ts",
            "//third_party/javascript/plottable/v3:src/interactions/keyInteraction.d.ts",
            "//third_party/javascript/plottable/v3:src/interactions/panZoomInteraction.d.ts",
            "//third_party/javascript/plottable/v3:src/interactions/pointerInteraction.d.ts",
        ],
        "Plottable.Plots": [
            "//third_party/javascript/plottable/v3:src/plots/areaPlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/barPlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/clusteredBarPlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/commons.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/linePlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/piePlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/plot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/rectanglePlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/scatterPlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/segmentPlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/stackedAreaPlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/stackedBarPlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/waterfallPlot.d.ts",
            "//third_party/javascript/plottable/v3:src/plots/xyPlot.d.ts",
        ],
        "Plottable.Scales": [
            "//third_party/javascript/plottable/v3:src/scales/index.d.ts",
            "//third_party/javascript/plottable/v3:src/scales/categoryScale.d.ts",
            "//third_party/javascript/plottable/v3:src/scales/colorScale.d.ts",
            "//third_party/javascript/plottable/v3:src/scales/interpolatedColorScale.d.ts",
            "//third_party/javascript/plottable/v3:src/scales/linearScale.d.ts",
            "//third_party/javascript/plottable/v3:src/scales/modifiedLogScale.d.ts",
            "//third_party/javascript/plottable/v3:src/scales/quantitativeScale.d.ts",
            "//third_party/javascript/plottable/v3:src/scales/scale.d.ts",
            "//third_party/javascript/plottable/v3:src/scales/timeScale.d.ts",
        ],
        "Plottable.Scales.TickGenerators": [
            "//third_party/javascript/plottable/v3:src/scales/tickGenerators.d.ts",
        ],
        "Plottable.Utils": [
            "//third_party/javascript/plottable/v3:src/utils/addD3SelectionMulti.d.ts",
            "//third_party/javascript/plottable/v3:src/utils/bucket.d.ts",
            "//third_party/javascript/plottable/v3:src/utils/callbackSet.d.ts",
            "//third_party/javascript/plottable/v3:src/utils/coerceD3.d.ts",
            "//third_party/javascript/plottable/v3:src/utils/entityStore.d.ts",
            "//third_party/javascript/plottable/v3:src/utils/makeEnum.d.ts",
            "//third_party/javascript/plottable/v3:src/utils/map.d.ts",
            "//third_party/javascript/plottable/v3:src/utils/set.d.ts",
            "//third_party/javascript/plottable/v3:src/utils/transformAwareTranslator.d.ts",
        ],
        "Plottable.Utils.Array": [
            "//third_party/javascript/plottable/v3:src/utils/arrayUtils.d.ts",
        ],
        "Plottable.Utils.Color": [
            "//third_party/javascript/plottable/v3:src/utils/colorUtils.d.ts",
        ],
        "Plottable.Utils.DOM": [
            "//third_party/javascript/plottable/v3:src/utils/domUtils.d.ts",
        ],
        "Plottable.Utils.Math": [
            "//third_party/javascript/plottable/v3:src/utils/mathUtils.d.ts",
        ],
        "Plottable.Utils.Stacking": [
            "//third_party/javascript/plottable/v3:src/utils/stackingUtils.d.ts",
        ],
        "Plottable.Utils.Window": [
            "//third_party/javascript/plottable/v3:src/utils/windowUtils.d.ts",
        ],
    },
    namespace_symbol_aliases = {
        "Plottable.Animators": {
            "AttributeToAppliedProjector": "Plottable.AttributeToAppliedProjector",
            "SimpleSelection": "Plottable.SimpleSelection",
        },
        "Plottable.Axes": {
            "Component": "Plottable.Components.Component",
            "Formatter": "Plottable.Formatters.Formatter",
            "Point": "Plottable.Point",
            "QuantitativeScale": "Plottable.Scales.QuantitativeScale",
            "Scale": "Plottable.Scales.Scale",
            "Scales": "Plottable.Scales",
            "SimpleSelection": "Plottable.SimpleSelection",
            "SpaceRequest": "Plottable.SpaceRequest",
        },
        "Plottable.Components": {
            "Bounds": "Plottable.Bounds",
            "Formatter": "Plottable.Formatters.Formatter",
            "IEntity": "Plottable.IEntity",
            "Interactions": "Plottable.Interactions",
            "Plots": "Plottable.Plots",
            "Point": "Plottable.Point",
            "QuantitativeScale": "Plottable.Scales.QuantitativeScale",
            "Scales": "Plottable.Scales",
            "SimpleSelection": "Plottable.SimpleSelection",
            "SpaceRequest": "Plottable.SpaceRequest",
            "SymbolFactory": "Plottable.SymbolFactories.SymbolFactory",
        },
        "Plottable.RenderController": {
            "Component": "Plottable.Components.Component",
            "RenderPolicies": "Plottable.RenderPolicies",
        },
        "Plottable.SymbolFactories": {
            "d3Shape": "d3",
        },
        "Plottable.Dispatchers": {
            "Component": "Plottable.Components.Component",
            "Dispatchers": "Plottable.Dispatchers",
            "Point": "Plottable.Point",
        },
        "Plottable.Drawers": {
            "AttributeToAppliedProjector": "Plottable.AttributeToAppliedProjector",
            "AttributeToProjector": "Plottable.AttributeToProjector",
            "Dataset": "Plottable.Dataset",
            "IAccessor": "Plottable.IAccessor",
            "IAnimator": "Plottable.Animators.IAnimator",
            "SimpleSelection": "Plottable.SimpleSelection",
            "SymbolFactory": "Plottable.SymbolFactories.SymbolFactory",
        },
        "Plottable.Interactions": {
            "Component": "Plottable.Components.Component",
            "Point": "Plottable.Point",
            "TransformableScale": "Plottable.Scales.TransformableScale",
        },
        "Plottable.Plots": {
            "AppliedDrawStep": "Plottable.Drawers.AppliedDrawStep",
            "AttributeToProjector": "Plottable.AttributeToProjector",
            "Bounds": "Plottable.Bounds",
            "Component": "Plottable.Components.Component",
            "Dataset": "Plottable.Dataset",
            "DrawStep": "Plottable.Drawers.DrawStep",
            "Drawers": "Plottable.Drawers",
            "Formatter": "Plottable.Formatters.Formatter",
            "IAccessor": "Plottable.IAccessor",
            "IAnimator": "Plottable.Animators.IAnimator",
            "IDrawer": "Plottable.Drawers.IDrawer",
            "IEntity": "Plottable.IEntity",
            "IScaleCallback": "Plottable.Scales.IScaleCallback",
            "Plots": "Plottable.Plots",
            "Point": "Plottable.Point",
            "Projector": "Plottable.Projector",
            "ProxyDrawer": "Plottable.Drawers.ProxyDrawer",
            "QuantitativeScale": "Plottable.Scales.QuantitativeScale",
            "Range": "Plottable.Range",
            "Scale": "Plottable.Scales.Scale",
            "SimpleSelection": "Plottable.SimpleSelection",
            "SymbolFactory": "Plottable.SymbolFactories.SymbolFactory",
            "TransformableScale": "Plottable.Scales.TransformableScale",
            "Utils": "Plottable.Utils",
            "d3Shape": "d3",
        },
        "Plottable.Scales": {
            "Dataset": "Plottable.Dataset",
            "Scales": "Plottable.Scales",
        },
        "Plottable.Scales.TickGenerators": {
            "QuantitativeScale": "Plottable.Scales.QuantitativeScale",
        },
        "Plottable.Utils": {
            "Bounds": "Plottable.Bounds",
            "Component": "Plottable.Components.Component",
            "Dataset": "Plottable.Dataset",
            "IAccessor": "Plottable.IAccessor",
            "Point": "Plottable.Point",
            "Range": "Plottable.Range",
            "SimpleSelection": "Plottable.SimpleSelection",
            "Utils": "Plottable.Utils",
        },
    },
    namespace_symbol_aliases_public = {
        "Plottable": {
            "Axis": "Plottable.Axes.Axis",
            "AxisOrientation": "Plottable.Axes.AxisOrientation",
            "ClickCallback": "Plottable.Interactions.ClickCallback",
            "Component": "Plottable.Components.Component",
            "ComponentCallback": "Plottable.Components.ComponentCallback",
            "ComponentContainer": "Plottable.Components.ComponentContainer",
            "Dispatcher": "Plottable.Dispatchers.Dispatcher",
            "DragBoxCallback": "Plottable.Components.DragBoxCallback",
            "DragCallback": "Plottable.Interactions.DragCallback",
            "EaseFn": "Plottable.Animators.EaseFn",
            "EaseName": "Plottable.Animators.EaseName",
            "Easing": "Plottable.Animators.Easing",
            "Formatter": "Plottable.Formatters.Formatter",
            "IAnimator": "Plottable.Animators.IAnimator",
            "IDragLineCallback": "Plottable.Components.IDragLineCallback",
            "IDrawer": "Plottable.Drawers.IDrawer",
            "IResizeHandler": "Plottable.Components.IResizeHandler",
            "IScaleCallback": "Plottable.Scales.IScaleCallback",
            "Interaction": "Plottable.Interactions.Interaction",
            "Key": "Plottable.Interactions.Key",
            "KeyCallback": "Plottable.Interactions.KeyCallback",
            "Null": "Plottable.Animators.Null",
            "Plot": "Plottable.Plots.Plot",
            "PointerCallback": "Plottable.Interactions.PointerCallback",
            "ProxyDrawer": "Plottable.Drawers.ProxyDrawer",
            "QuantitativeScale": "Plottable.Scales.QuantitativeScale",
            "Renderer": "Plottable.Plots.Renderer",
            "Scale": "Plottable.Scales.Scale",
            "SymbolFactory": "Plottable.SymbolFactories.SymbolFactory",
            "TimeInterval": "Plottable.Axes.TimeInterval",
            "TransformableScale": "Plottable.Scales.TransformableScale",
            "XAlignment": "Plottable.Components.XAlignment",
            "XYPlot": "Plottable.Plots.XYPlot",
            "YAlignment": "Plottable.Components.YAlignment",
        },
    },
)

# Removes the 'declare module' block inside this file, but keeps its content.
genrule(
    name = "kludge_d3_transition",
    srcs = ["@org_definitelytyped_types_d3_transition//:index.d.ts"],
    outs = ["d3-transition.d.ts"],
    cmd = "sed '/^declare module/d' $< | awk '/^}$$/ && !p {p++;next}1' >$@",
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
