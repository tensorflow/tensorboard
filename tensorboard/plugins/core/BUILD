# Description:
#   TensorBoard core plugin.

package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:zipper.bzl", "tensorboard_zip_file")

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "core_plugin",
    srcs = ["core_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
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
        "//tensorboard:expect_sqlite3_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)
