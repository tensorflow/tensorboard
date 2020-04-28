# Description:
# Experiment Data Access API.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "experimental",
    srcs = ["__init__.py"],
    srcs_version = "PY3",
    deps = [
        ":experiment_from_dev",
    ]
)

py_library(
    name = "base_experiment",
    srcs = ["base_experiment.py"],
    srcs_version = "PY3",
    deps = [
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "experiment_from_dev",
    srcs = ["experiment_from_dev.py"],
    srcs_version = "PY3",
    deps = [
        # TODO(cais): Clean up dependencies.
        ":base_experiment",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_pandas_installed",
        "//tensorboard/uploader:auth",
        "//tensorboard/uploader:server_info",
        "//tensorboard/uploader:util",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "//tensorboard/util:grpc_util",
        "//tensorboard/util:tb_logging",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "experiment_from_dev_test",
    srcs = ["experiment_from_dev_test.py"],
    deps = [
        ":experiment_from_dev",
        # TODO(cais): Clean up dependencies.
        # ":test_util",
        # ":util",
        "//tensorboard:expect_grpc_installed",
        "//tensorboard:expect_grpc_testing_installed",
        "//tensorboard:test",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/uploader/proto:protos_all_py_pb2_grpc",
        "//tensorboard/util:grpc_util",
        "@org_pythonhosted_mock",
    ],
)

py_binary(  # TODO(cais): Delete. DO NOT SUBMIT.
    name = "test_binary",
    srcs = ["test_binary.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard/data/experimental:experiment_from_dev",
        "@org_pythonhosted_six",
    ],
)
