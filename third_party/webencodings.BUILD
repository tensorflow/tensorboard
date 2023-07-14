# Description:
#   Character encoding aliases for legacy web content

load("@rules_python//python:py_library.bzl", "py_library")

licenses(["notice"])  # BSD

exports_files(["LICENSE"])

py_library(
    name = "org_pythonhosted_webencodings",
    srcs = [
        "webencodings/__init__.py",
        "webencodings/labels.py",
        "webencodings/mklabels.py",
        "webencodings/x_user_defined.py",
    ],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
)
