package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

# This is built with Bazel for tests, but should also be runnable without Bazel.
py_binary(
    name = "build_pip_package",
    srcs = ["build_pip_package.py"],
    data = [
        "setup.py",
        "//tensorboard/data/server/pip_package:tensorboard_data_server/__init__.py",
    ],
)

py_test(
    name = "build_pip_package_test",
    srcs = ["build_pip_package_test.py"],
    data = [
        ":build_pip_package",
    ],
    tags = ["manual"],  # depends on re-invoking `python setup.py`, `setuptools`
    deps = [
        "//tensorboard:test",
    ],
)

# Helper to actually install into your ambient virtualenv with one step.
py_binary(
    name = "install",
    srcs = ["install.py"],
    data = [
        ":build_pip_package",
        "//tensorboard/data/server",
    ],
)
