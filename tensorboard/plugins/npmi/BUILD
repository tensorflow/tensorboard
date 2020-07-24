# Description:
# TensorBoard nPMI Plugin: A plugin for inspecting nPMI calculations for trained
# models. nPMI is a technique presented in a paper (https://svn.spraakdata.gu.se/repos/gerlof/pub/www/Docs/npmi-pfd.pdfhttps://svn.spraakdata.gu.se/repos/gerlof/pub/www/Docs/npmi-pfd.pdf)
# presented by Gerlof Bouma.

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "npmi_plugin",
    srcs = ["npmi_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":metadata",
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
        "//tensorboard:context",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
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
        ":metadata",
        "//tensorboard/compat",
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
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat",
        "//tensorboard/util:test_util",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY2AND3",
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [
        ":protos_all_py_pb2",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/util:tb_logging",
    ],
)

tb_proto_library(
    name = "protos_all",
    srcs = ["plugin_data.proto"],
)
