package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tensorboard",
    srcs = ["tensorboard.html"],
    path = "/",
    deps = [
        ":analytics",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_tensorboard",
        "//tensorboard/components/tf_tensorboard:default_plugins",
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
    name = "analytics",
    srcs = [
        "analytics.html",
    ],
    path = "/",
)

tf_web_library(
    name = "security",
    srcs = [
        "security.html",
    ],
    path = "/",
)

tf_web_library(
    name = "ng_polymer_lib",
    srcs = [
        "ng_polymer_lib.html",
    ],
    path = "/",
    deps = [
        ":analytics",
        ":security",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/tf_tensorboard",
        "//tensorboard/components/tf_tensorboard:default_plugins",
        "//tensorboard/components/tf_tensorboard:registry",
    ],
)

# This Polymer only binary (as opposed to ng_index) allows ng_index to be built without
# JSCompiler step. In other words, Angular-only changes can be built faster
# incrementally.
tensorboard_html_binary(
    name = "ng_polymer_lib_binary",
    compile = True,
    input_path = "/ng_polymer_lib.html",
    output_path = "/ng_polymer_lib_binary.html",
    deps = [":ng_polymer_lib"],
)

tf_web_library(
    name = "ng_tensorboard",
    srcs = [
        "ng_tensorboard.html",
    ],
    path = "/",
    deps = [
        ":ng_polymer_lib_binary",
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
