# Description:
# TensorBoard plugin for distributions

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

## Distributions Plugin ##
py_library(
    name = "distributions_plugin",
    srcs = ["distributions_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
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
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug//:werkzeug",
        "@six_archive//:six",
    ],
)

py_library(
    name = "compressor",
    srcs = ["compressor.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = ["//tensorboard:expect_numpy_installed"],
)

py_test(
    name = "compressor_test",
    size = "small",
    srcs = ["compressor_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":compressor",
        "//tensorboard:expect_tensorflow_installed",
    ],
)
