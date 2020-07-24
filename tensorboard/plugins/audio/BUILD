# Description:
# TensorBoard plugin for audio

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "audio_plugin",
    srcs = ["audio_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:errors",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "audio_plugin_test",
    size = "small",
    srcs = ["audio_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":audio_plugin",
        ":summary",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

# TODO(#2007): Remove this after pruning unnecessary TensorFlow deps in main test
py_test(
    name = "audio_plugin_notf_test",
    size = "small",
    srcs = ["audio_plugin_test.py"],
    main = "audio_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":audio_plugin",
        ":summary",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/compat:no_tensorflow",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "summary",
    srcs = ["summary.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":metadata",
        ":summary_v2",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/util:encoder",
    ],
)

py_library(
    name = "summary_v2",
    srcs = ["summary_v2.py"],
    srcs_version = "PY2AND3",
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [
        ":metadata",
        "//tensorboard/compat",
        "//tensorboard/util:lazy_tensor_creator",
    ],
)

py_test(
    name = "summary_test",
    size = "medium",
    srcs = ["summary_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":metadata",
        ":summary",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/util:tensor_util",
    ],
)

py_binary(
    name = "audio_demo",
    srcs = ["audio_demo.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
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
