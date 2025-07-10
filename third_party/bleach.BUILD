# Description:
#   Build file for Bleach.
# License:
#   Apache 2.0
load("@rules_python//python:py_library.bzl", "py_library")

package(default_visibility = ["//visibility:public"])

licenses(["notice"])

exports_files(["LICENSE"])

py_library(
    name = "org_mozilla_bleach",
    srcs = [
        "bleach/__init__.py",
        "bleach/callbacks.py",
        "bleach/encoding.py",
        "bleach/linkifier.py",
        "bleach/sanitizer.py",
        "bleach/utils.py",
        "bleach/version.py",
    ],
)
