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
        "bleach/html5lib_shim.py",
        "bleach/linkifier.py",
        "bleach/parse_shim.py",
        "bleach/sanitizer.py",
        "bleach/six_shim.py",
    ] + glob(["bleach/_vendor/**/*.py"]),
    deps = ["@org_pythonhosted_webencodings"],
)
