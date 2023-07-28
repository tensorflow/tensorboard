load("@rules_python//python:py_binary.bzl", "py_binary")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//visibility:private"])

licenses(["notice"])

# This is built with Bazel for tests, but should also be runnable without Bazel.
py_binary(
    name = "build",
    srcs = ["build.py"],
    data = [
        "setup.py",
        "//tensorboard/data/server/pip_package:tensorboard_data_server/__init__.py",
    ],
)

py_test(
    name = "build_test",
    srcs = ["build_test.py"],
    data = [
        ":build",
    ],
    tags = [
        # depends on re-invoking `python setup.py`, `setuptools`
        "manual",
        "notap",
    ],
    deps = [
        "//tensorboard:test",
    ],
)

# Helper to actually install into your ambient virtualenv with one step.
py_binary(
    name = "install",
    srcs = ["install.py"],
    data = [
        ":build",
        "//tensorboard/data/server",
    ],
)
