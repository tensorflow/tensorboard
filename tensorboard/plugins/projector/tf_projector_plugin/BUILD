load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

alias(
    name = "tf_projector_plugin",
    actual = "//tensorboard/plugins/projector/polymer3/tf_projector_plugin:tf_projector_plugin",
)

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

genrule(
    name = "index_js_gen",
    srcs = [
        "//tensorboard/plugins/projector/polymer3/tf_projector_plugin:index.js",
    ],
    outs = ["index.js"],
    cmd = "cat $(SRCS) > $@",
)

genrule(
    name = "projector_binary_js_gen",
    srcs = [
        "//tensorboard/plugins/projector/polymer3/tf_projector_plugin:projector_binary.js",
    ],
    outs = ["projector_binary.js"],
    cmd = "cat $(SRCS) > $@",
)

genrule(
    name = "projector_binary_html_gen",
    srcs = [
        "//tensorboard/plugins/projector/polymer3/tf_projector_plugin:projector_binary.html",
    ],
    outs = ["projector_binary.html"],
    cmd = "cat $(SRCS) > $@",
)
