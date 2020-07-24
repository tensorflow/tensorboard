# Description:
# TensorBoard Debugger V2 Plugin: A plugin for inspecting and debugging
# the internals of a TensorFlow program (e.g., graphs, functions and tensors),
# with a focus on TensorFlow 2.x.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "text_v2_plugin",
    srcs = ["text_v2_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/text:metadata",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "text_v2_plugin_test",
    size = "small",
    srcs = ["text_v2_plugin_test.py"],
    main = "text_v2_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":text_v2_plugin",
        "//tensorboard:context",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/scalar:summary_v2",
        "//tensorboard/plugins/text:summary_v2",
    ],
)
