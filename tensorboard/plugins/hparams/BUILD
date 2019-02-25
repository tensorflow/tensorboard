# Description:
# TensorBoard plugin for hparams

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:protos.bzl", "tb_proto_library")

exports_files(["LICENSE"])

py_library(
    name = "hparams_plugin",
    srcs = [
        "backend_context.py",
        "get_experiment.py",
        "hparams_plugin.py",
        "list_metric_evals.py",
        "list_session_groups.py",
        "metrics.py",
    ],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":error",
        ":metadata",
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/compat:tensorflow",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/scalar:metadata",
        "//tensorboard/plugins/scalar:scalars_plugin",
        "//tensorboard/util",
        "@com_google_protobuf//:protobuf_python",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "list_session_groups_test",
    size = "small",
    srcs = [
        "list_session_groups_test.py",
    ],
    deps = [
        ":hparams_plugin",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/backend/event_processing:event_multiplexer",
    ],
)

py_test(
    name = "list_metric_evals_test",
    size = "small",
    srcs = [
        "list_metric_evals_test.py",
    ],
    deps = [
        ":hparams_plugin",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "backend_context_test",
    size = "small",
    srcs = [
        "backend_context_test.py",
    ],
    deps = [
        ":hparams_plugin",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/backend/event_processing:event_multiplexer",
    ],
)

py_binary(
    name = "hparams_demo",
    srcs = ["hparams_demo.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:expect_absl_app_installed",
        "//tensorboard:expect_absl_flags_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins/scalar:summary",
        "@org_pythonhosted_six",
    ],
)

py_binary(
    name = "hparams_util",
    srcs = ["hparams_util.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:expect_absl_app_installed",
        "//tensorboard:expect_absl_flags_installed",
        "//tensorboard:expect_tensorflow_installed",
        "@com_google_protobuf//:protobuf_python",
        "@org_pythonhosted_six",
    ],
)

sh_test(
    name = "hparams_util_test",
    srcs = ["hparams_util_test.sh"],
    data = [
        ":hparams_util",
    ],
    tags = [
	# Suppress for 1.13 release; this test won't pass until TF 1.14.
        "manual",
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
        ":protos_all_py_pb2",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)

py_test(
    name = "summary_test",
    srcs = ["summary_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":error",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)

py_library(
    name = "error",
    srcs = ["error.py"],
    srcs_version = "PY2AND3",
)

tb_proto_library(
    name = "protos_all",
    srcs = [
        "api.proto",
        "hparams_util.proto",
        "plugin_data.proto",
    ],
    visibility = ["//visibility:public"],
)
