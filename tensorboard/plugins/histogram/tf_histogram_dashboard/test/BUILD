package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "test",
    srcs = [
        "tests.html",
        "histogramTests.ts",
    ] + glob(["data/**"]),
    path = "/tf-histogram-dashboard/test",
    deps = [
        "//tensorboard/plugins/histogram/tf_histogram_dashboard",
        "//tensorboard/components/tf_imports:web_component_tester",
        "//tensorboard/components/tf_imports:webcomponentsjs",
    ],
)

