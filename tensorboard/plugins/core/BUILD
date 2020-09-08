# Description:
#   TensorBoard core plugin.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

exports_files(["LICENSE"])

py_library(
    name = "core_plugin",
    srcs = ["core_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:tb_logging",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "core_plugin_test",
    size = "small",
    srcs = ["core_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":core_plugin",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_mock",
        "@org_pythonhosted_six",
    ],
)
