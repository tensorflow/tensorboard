load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "vz_projector",
    srcs = [
        "analyticsLogger.ts",
        "bundle.ts",
        "data.ts",
        "data-provider.ts",
        "data-provider-demo.ts",
        "data-provider-proto.ts",
        "data-provider-server.ts",
        "external.d.ts",
        "knn.ts",
        "label.ts",
        "logging.ts",
        "projectorEventContext.ts",
        "projectorScatterPlotAdapter.ts",
        "renderContext.ts",
        "scatterPlot.ts",
        "scatterPlotRectangleSelector.ts",
        "scatterPlotVisualizer.ts",
        "scatterPlotVisualizer3DLabels.ts",
        "scatterPlotVisualizerCanvasLabels.ts",
        "scatterPlotVisualizerPolylines.ts",
        "scatterPlotVisualizerSprites.ts",
        "styles.ts",
        "umap.d.ts",
        "util.ts",
        "vector.ts",
        "vz-projector.html.ts",
        "vz-projector.ts",
        "vz-projector-app.ts",
        "vz-projector-bookmark-panel.html.ts",
        "vz-projector-bookmark-panel.ts",
        "vz-projector-dashboard.ts",
        "vz-projector-data-panel.html.ts",
        "vz-projector-data-panel.ts",
        "vz-projector-input.ts",
        "vz-projector-inspector-panel.html.ts",
        "vz-projector-inspector-panel.ts",
        "vz-projector-legend.ts",
        "vz-projector-metadata-card.ts",
        "vz-projector-projections-panel.html.ts",
        "vz-projector-projections-panel.ts",
    ],
    strict_checks = False,
    deps = [
        ":bh_tsne",
        ":heap",
        ":sptree",
        "//tensorboard/components:analytics",
        "//tensorboard/components:security",
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/polymer:register_style_dom_module",
        "//tensorboard/components/tf_wbr_string",
        "//tensorboard/webapp/third_party:tfjs",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//d3",
        "@npm//numeric",
        "@npm//three",
        "@npm//umap-js",
    ],
)

tf_ts_library(
    name = "heap",
    srcs = ["heap.ts"],
    strict_checks = False,
)

tf_ts_library(
    name = "sptree",
    srcs = ["sptree.ts"],
    strict_checks = False,
)

tf_ts_library(
    name = "bh_tsne",
    srcs = ["bh_tsne.ts"],
    strict_checks = False,
    deps = [":sptree"],
)

tf_js_binary(
    name = "standalone_bundle",
    compile = 1,
    entry_point = "bundle.ts",
    deps = [
        ":vz_projector",
    ],
)

################# Standalone development #################

tf_web_library(
    name = "standalone_lib",
    srcs = [
        "standalone_lib.html",
        "standalone_projector_config.json",
        ":standalone_bundle.js",
    ],
    path = "/",
    deps = [
        "//tensorboard/components/tf_imports:roboto",
    ],
)

tensorboard_html_binary(
    name = "standalone",
    compile = False,
    input_path = "/standalone_lib.html",
    js_path = "/standalone.js",
    output_path = "/standalone.html",
    deps = [
        ":standalone_lib",
    ],
)
