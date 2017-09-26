# Description:
#  Tools for building the TensorFlow pip package.

package(default_visibility = ["//visibility:private"])

licenses(["notice"])  # Apache 2.0

filegroup(
    name = "licenses",
    data = [
        "@org_html5lib//:LICENSE",
        "@org_mozilla_bleach//:LICENSE",
        "@org_pocoo_werkzeug//:LICENSE",
        "@org_pythonhosted_markdown//:LICENSE.md",
        "@protobuf//:LICENSE",
        "@org_pythonhosted_six//:LICENSE",
    ]
)

sh_binary(
    name = "build_pip_package",
    srcs = ["build_pip_package.sh"],
    data = [
          ":licenses",
          "MANIFEST.in",
          "setup.py",
          "//tensorboard",
          "//tensorboard:version",
          "//tensorboard:summary",
        ],
)
