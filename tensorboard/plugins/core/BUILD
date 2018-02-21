# Description:
#   TensorBoard core plugin.

package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:zipper.bzl", "tensorboard_zip_file")

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "core_plugin",
    srcs = ["core_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "core_plugin_test",
    size = "small",
    srcs = ["core_plugin_test.py"],
    data = ["test_webfiles.zip"],
    srcs_version = "PY2AND3",
    deps = [
        ":core_plugin",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

tf_web_library(
    name = "test_assets",
    testonly = 1,
    srcs = ["index.html"],
    path = "/",
)

tensorboard_zip_file(
    name = "test_webfiles",
    testonly = 1,
    deps = [":test_assets"],
)
