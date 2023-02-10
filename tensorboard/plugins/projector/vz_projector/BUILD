load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ng_web_test_suite", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard/plugins/projector:__subpackages__"])

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
        "//tensorboard/webapp/third_party:d3",
        "//tensorboard/webapp/third_party:numeric",
        "//tensorboard/webapp/third_party:tfjs",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
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

################# Standalone development #################

tf_js_binary(
    name = "standalone_bundle_no_vendor",
    compile = 1,
    entry_point = "bundle.ts",
    includes_polymer = True,
    deps = [
        ":vz_projector",
    ],
)

genrule(
    name = "standalone_bundle_js",
    srcs = [
        # DO NOT SORT.
        # internal: umap_runtime_dep
        ":standalone_bundle_no_vendor.js",
    ],
    outs = ["standalone_bundle.js"],
    cmd = "cat $(SRCS) > $@",
)

tf_web_library(
    name = "standalone",
    srcs = [
        "standalone.html",
        "standalone_projector_config.json",
        ":standalone_bundle.js",
    ],
    path = "/",
    deps = [
        "//tensorboard/components/tf_imports:roboto",
    ],
)

################# Test ##################

tf_ts_library(
    name = "vz_projector_test_lib",
    testonly = True,
    srcs = [
        "knn_test.ts",
    ],
    deps = [
        ":vz_projector",
        "@npm//@types/jasmine",
    ],
)

tf_ng_web_test_suite(
    name = "vz_projector_test",
    deps = [
        ":vz_projector_test_lib",
    ],
)
