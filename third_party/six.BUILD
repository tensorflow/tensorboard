# Description:
#   Six provides simple utilities for wrapping over differences between Python 2
#   and Python 3.

load("@rules_python//python:py_library.bzl", "py_library")

licenses(["notice"])  # MIT

exports_files(["LICENSE"])

py_library(
    name = "org_pythonhosted_six",
    srcs = ["six.py"],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
)
