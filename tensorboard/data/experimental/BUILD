# Description:
# Experiment Data Access API.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "base_experiment",
    srcs = ["base_experiment.py"],
    srcs_version = "PY3",
)

py_library(
    name = "experiment_from_dev",
    srcs = ["experiment_from_dev.py"],
    srcs_version = "PY3",
    deps = [
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
    ],
)

py_test(
    name = "experiment_from_dev_test",
    srcs = ["experiment_from_dev_test.py"],
    srcs_version = "PY3",
    deps = [
        ":experiment_from_dev",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_pandas_installed",
        "//tensorboard:test",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/uploader:test_util",
        "//tensorboard/uploader/proto:protos_all_py_pb2",
        "//tensorboard/util:grpc_util",
        "@org_pythonhosted_mock",
    ],
)

py_library(
    name = "lib_init_only",
    srcs = ["__init__.py"],
    srcs_version = "PY3",
    visibility = ["//tensorboard:internal"],
    deps = [
        ":experiment_from_dev",
    ],
)

py_binary(
    name = "test_binary",
    srcs = ["test_binary.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/data/experimental:experiment_from_dev",
        "@org_pythonhosted_six",
    ],
)
