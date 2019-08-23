package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tensorboard",
    srcs = ["tensorboard.html"],
    path = "/",
    deps = [
        ":lib",
    ],
)

tensorboard_html_binary(
    name = "index",
    compile = True,
    input_path = "/tensorboard.html",
    output_path = "/index.html",
    deps = [":tensorboard"],
)

tf_web_library(
    name = "lib",
    srcs = [
        "analytics.html",
        "lib.html",
    ],
    path = "/",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_tensorboard",
        "//tensorboard/components/tf_tensorboard:default_plugins",
    ],
)

tensorboard_html_binary(
    name = "lib_binary",
    compile = True,
    input_path = "/lib.html",
    output_path = "/lib_binary.html",
    deps = [":lib"],
)

tf_web_library(
    name = "ng_tensorboard",
    srcs = [
        "ng_tensorboard.html",
    ],
    path = "/",
    deps = [
        ":lib_binary",
        "//tensorboard/components/tf_ng_tensorboard",
        "//tensorboard/components/tf_ng_tensorboard:material_theme",
    ],
)

tensorboard_html_binary(
    name = "ng_index",
    input_path = "/ng_tensorboard.html",
    output_path = "/ng_index.html",
    deps = [":ng_tensorboard"],
)

tf_web_library(
    name = "trace_viewer",
    srcs = ["trace_viewer.html"],
    path = "/",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_trace_viewer",
    ],
)

tensorboard_html_binary(
    name = "trace_viewer_index",
    input_path = "/trace_viewer.html",
    output_path = "/trace_viewer_index.html",
    deps = [":trace_viewer"],
)
