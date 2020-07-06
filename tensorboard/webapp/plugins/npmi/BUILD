# Description:
# TensorBoard nPMI Plugin: A plugin for inspecting nPMI calculations for trained
# models.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "npmi_plugin",
    srcs = ["npmi_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:errors",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "npmi_plugin_test",
    size = "small",
    srcs = ["npmi_plugin_test.py"],
    main = "npmi_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":npmi_plugin",
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard:plugin_util",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/util:test_util",
    ],
)

py_library(
    name = "summary",
    srcs = ["summary.py"],
    srcs_version = "PY2AND3",
    visibility = [
        "//visibility:public",
    ],
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ],
)
