load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_web_library(
    name = "projector_assets",
    srcs = [
        # Keep this in sync with pip_package/setup.py
        ":projector_binary.html",
        ":projector_binary.js",
        "index.js",
    ],
    path = "/tf-projector",
)

tensorboard_html_binary(
    name = "projector_binary",
    compile = False,
    input_path = "/tf-projector/tf-projector-plugin.html",
    js_path = "/projector_binary.js",
    output_path = "/tf-projector/projector_binary.html",
    deps = [
        ":tf_projector_plugin",
        "//tensorboard/plugins/projector/vz_projector:standalone_lib",
    ],
)

tf_web_library(
    name = "tf_projector_plugin",
    srcs = [
        "tf-projector-plugin.html",
    ],
    path = "/tf-projector",
    deps = [
        "//tensorboard/components/tf_imports:roboto",
        "//tensorboard/plugins/projector/vz_projector:standalone_lib",
    ],
)
