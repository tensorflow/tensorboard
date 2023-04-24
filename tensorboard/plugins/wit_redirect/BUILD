# Description:
# Plugin with installation instructions for dynamic interpretability plugin

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "wit_redirect_plugin",
    srcs = ["wit_redirect_plugin.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/plugins:base_plugin",
    ],
)

py_test(
    name = "wit_redirect_plugin_test",
    srcs = ["wit_redirect_plugin_test.py"],
    srcs_version = "PY3",
    deps = [
        ":wit_redirect_plugin",
        "//tensorboard:test",
        "//tensorboard/plugins:base_plugin",
    ],
)
