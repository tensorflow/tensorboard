# Description:
#   Werkzeug provides utilities for making WSGI applications

load("@rules_python//python:py_library.bzl", "py_library")

licenses(["notice"])  # BSD 3-Clause

exports_files(["LICENSE"])

# Note: this library includes test code. Consider creating a testonly target.
py_library(
    name = "org_pocoo_werkzeug",
    srcs = glob(["werkzeug/**/*.py"]),
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
)
