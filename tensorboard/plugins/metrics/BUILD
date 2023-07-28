# Description:
# TensorBoard plugin for metrics (scalars, images, histograms, distributions)

load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "metrics_plugin",
    srcs = [
        "metadata.py",
        "metrics_plugin.py",
    ],
    srcs_version = "PY3",
    deps = [
        "//tensorboard:errors",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/histogram:metadata",
        "//tensorboard/plugins/image:metadata",
        "//tensorboard/plugins/scalar:metadata",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY3",
)

py_test(
    name = "metrics_plugin_test",
    size = "medium",
    srcs = ["metrics_plugin_test.py"],
    main = "metrics_plugin_test.py",
    python_version = "PY3",
    srcs_version = "PY3",
    deps = [
        ":metrics_plugin",
        "//tensorboard:context",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/image:metadata",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
    ],
)
