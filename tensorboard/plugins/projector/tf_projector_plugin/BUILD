load("//tensorboard/defs:web.bzl", "tb_combine_html", "tf_web_library")

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

tb_combine_html(
    name = "projector_binary",
    input_path = "/tf-projector/tf-projector-plugin.html",
    js_path = "/projector_binary.js",
    output_path = "/tf-projector/projector_binary.html",
    deps = [
        ":tf_projector_plugin",
        "//tensorboard/plugins/projector/vz_projector:standalone",
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
        "//tensorboard/plugins/projector/vz_projector:standalone",
    ],
)
