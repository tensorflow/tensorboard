# Description:
# A plugin system for TensorBoard
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "base_plugin",
    srcs = ["base_plugin.py"],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
)

py_test(
    name = "base_plugin_test",
    srcs = ["base_plugin_test.py"],
    srcs_version = "PY3",
    deps = [
        ":base_plugin",
        "//tensorboard:test",
    ],
)
