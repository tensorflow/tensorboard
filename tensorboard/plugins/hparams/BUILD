# Description:
# TensorBoard plugin for hparams

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

exports_files(["LICENSE"])

py_binary(
    name = "hparams_demo",
    srcs = ["hparams_demo.py"],
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
        ":constants",
        ":protos_all_py_pb2",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "constants",
    srcs = ["constants.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ],
)

tb_proto_library(
    name = "protos_all",
    srcs = [
        "api.proto",
        "summary_proto.proto",
    ],
    visibility = ["//visibility:public"],
)
