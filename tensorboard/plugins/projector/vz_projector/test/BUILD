package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "test",
    srcs = [
        "assert.js",
        "data-provider_test.js",
        "data_test.js",
        "sptree_test.js",
        "tests.html",
        "util_test.js",
        # "scatterPlotRectangleSelector_test.ts",
        # "vz-projector-projections-panel_test.ts",
    ],
    path = "/vz-projector/test",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:web_component_tester",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/plugins/projector/vz_projector",
    ],
)
