package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "projector_assets",
    srcs = [
        # Keep this in sync with pip_package/setup.py
        ":projector_binary.html",
        ":projector_binary.html.scripts_sha256",
        "index.js",
    ],
    path = "/tf-projector",
)

tensorboard_html_binary(
    name = "projector_binary",
    compile = True,
    input_path = "/tf-projector/tf-projector-plugin.html",
    output_path = "/tf-projector/projector_binary.html",
    deps = [
        ":tf_projector_plugin",
    ],
)

tf_web_library(
    name = "tf_projector_plugin",
    srcs = [
        "tf-projector-plugin.html",
    ],
    path = "/tf-projector",
    deps = [
        "//tensorboard/components:security",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/projector/vz_projector",
        "@com_google_fonts_roboto",
    ],
)
