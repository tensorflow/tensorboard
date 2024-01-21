# Description:
# Uploader for TensorBoard.dev

load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "upload_tracker",
    srcs = ["upload_tracker.py"],
    srcs_version = "PY3",
)

py_test(
    name = "upload_tracker_test",
    srcs = ["upload_tracker_test.py"],
    srcs_version = "PY3",
    deps = [
        ":upload_tracker",
        "//tensorboard:test",
    ],
)

py_library(
    name = "logdir_loader",
    srcs = ["logdir_loader.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/backend/event_processing:directory_watcher",
        "//tensorboard/backend/event_processing:io_wrapper",
        "//tensorboard/util:tb_logging",
    ],
)

py_test(
    name = "logdir_loader_test",
    srcs = ["logdir_loader_test.py"],
    deps = [
        ":logdir_loader",
        "//tensorboard:test",
        "//tensorboard/backend/event_processing:directory_loader",
        "//tensorboard/backend/event_processing:event_file_loader",
        "//tensorboard/backend/event_processing:io_wrapper",
        "//tensorboard/util:test_util",
    ],
)

py_library(
    name = "util",
    srcs = ["util.py"],
    srcs_version = "PY3",
)

py_test(
    name = "util_test",
    srcs = ["util_test.py"],
    deps = [
        ":util",
        "//tensorboard:test",
    ],
)
