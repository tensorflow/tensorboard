# Description:
# TensorBoard plugin for hparams_explorer

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

exports_files(["LICENSE"])

## HparamsExplorer Plugin ##
py_library(
    name = "hparams_explorer_plugin",
    srcs = ["hparams_explorer_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":plugin_metadata",
        ":metadata_utils",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "metadata_utils",
    srcs = ["metadata_utils.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2"
    ])

py_test(
    name = "hparams_explorer_plugin_test",
    size = "small",
    srcs = ["hparams_explorer_plugin_test.py"],
    main = "hparams_explorer_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":hparams_explorer_plugin",
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_binary(
    name = "hparams_explorer_demo",
    srcs = ["hparams_explorer_demo.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins/scalar:summary",
        "@org_pythonhosted_six",
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
        ":plugin_metadata",
        ":protos_all_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard:util",
    ],
)

py_library(
    name = "plugin_metadata",
    srcs = ["plugin_metadata.py"],
    srcs_version = "PY2AND3",
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [
        ":protos_all_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "summary_test",
    size = "small",
    srcs = ["summary_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":metadata",
        ":summary",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

tb_proto_library(
    name = "protos_all",
    srcs = [
        "metadata.proto",
        "plugin_data.proto",
    ],
    visibility = ["//visibility:public"],
)
