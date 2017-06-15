# Description:
#  Tools for building the TensorFlow pip package.

package(default_visibility = ["//visibility:private"])

filegroup(
    name = "licenses",
    data = [
        "@org_html5lib//:LICENSE",
        "@org_mozilla_bleach//:LICENSE",
        "@org_pocoo_werkzeug//:LICENSE",
        "@org_pythonhosted_markdown//:LICENSE.md",
        "@protobuf//:LICENSE",
        "@six_archive//:LICENSE",
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
        ],
)