package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("@io_bazel_rules_webtesting//web:py.bzl", "py_web_test_suite")

licenses(["notice"])  # Apache 2.0

py_web_test_suite(
    name = "test",
    # TODO(@wchargin): This test does not work in headless mode.
    tags = ["manual"],
    srcs = ["test.py"],
    browsers = ["//tensorboard/functionaltests/browsers:chromium"],
    timeout = "short",
    flaky = True,
    data = [
        ":test_web_library",
    ],
    srcs_version = "PY2AND3",
    deps = [
        "@io_bazel_rules_webtesting//testing/web",
        "//tensorboard/functionaltests:wct_test_driver",
    ],
)

tf_web_library(
    name = "test_web_library",
    srcs = [
        "assert.ts",
        "data-provider_test.ts",
        "data_test.ts",
        "sptree_test.ts",
        "tests.html",
        "util_test.ts",
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
