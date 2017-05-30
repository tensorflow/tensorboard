# Description:
# TensorBoard plugin for histograms

package(default_visibility = ["//third_party/tensorflow:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

load("//third_party/tensorflow:tensorflow.bzl", "py_test")

## Histograms Plugin ##
py_library(
    name = "histograms_plugin",
    srcs = ["histograms_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = [
        "//third_party/tensorflow:internal",
    ],
    deps = [
        "//tensorboard/backend:http_util",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

py_test(
    name = "histograms_plugin_test",
    size = "small",
    srcs = ["histograms_plugin_test.py"],
    main = "histograms_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":histograms_plugin",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    visibility = ["//third_party/tensorflow:__pkg__"],
)
