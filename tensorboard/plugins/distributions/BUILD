# Description:
# TensorBoard plugin for distributions

package(default_visibility = ["//third_party/tensorflow:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

load("//third_party/tensorflow:tensorflow.bzl", "py_test")

## Distributions Plugin ##
py_library(
    name = "distributions_plugin",
    srcs = ["distributions_plugin.py"],
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
    name = "distributions_plugin_test",
    size = "small",
    srcs = ["distributions_plugin_test.py"],
    main = "distributions_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":distributions_plugin",
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
