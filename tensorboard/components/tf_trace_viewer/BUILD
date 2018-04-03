package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_trace_viewer",
    srcs = [
        "tf-trace-viewer.html",
        "@org_chromium_catapult_vulcanized_trace_viewer//:trace_viewer_full.html",
    ],
    path = "/tf-trace-viewer",
    deps = [
        ":tf-trace-viewer-helper",
    ],
)

tf_web_library(
    name = "demo",
    srcs = ["demo.html"],
    path = "/tf-trace-viewer",
    deps = [
        ":tf_trace_viewer",
        "//tensorboard/components/tf_trace_viewer/data",
    ],
)

tf_web_library(
    name = "tf-trace-viewer-helper",
    srcs = [
        "tf-trace-viewer-helper.ts",
    ],
    path = "/tf-trace-viewer",
)
