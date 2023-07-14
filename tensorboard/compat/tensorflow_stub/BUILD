# Description:
# TensorBoard, a dashboard for investigating TensorFlow
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "tensorflow_stub",
    srcs = glob(["*.py"]) + [
        "compat/__init__.py",
        "compat/v1/__init__.py",
        "io/__init__.py",
        "io/gfile.py",
    ],
    srcs_version = "PY3",
    deps = [
        "//tensorboard:expect_absl_flags_installed",
        "//tensorboard:expect_fsspec_installed",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)

py_test(
    name = "gfile_test",
    size = "small",
    srcs = ["io/gfile_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":tensorflow_stub",
        "//tensorboard:test",
    ],
)

py_test(
    name = "gfile_tf_test",
    size = "small",
    srcs = ["io/gfile_tf_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":tensorflow_stub",
        "//tensorboard:test",
    ],
)

py_test(
    name = "gfile_s3_test",
    size = "small",
    srcs = ["io/gfile_s3_test.py"],
    srcs_version = "PY3",
    tags = [
        "manual",
        "notap",
    ],
    deps = [
        ":tensorflow_stub",
        "//tensorboard:test",
    ],
)

py_test(
    name = "gfile_fsspec_test",
    size = "small",
    srcs = ["io/gfile_fsspec_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":tensorflow_stub",
        "//tensorboard:expect_fsspec_installed",
        "//tensorboard:test",
    ],
)
