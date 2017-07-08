# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = [":internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")
load("//tensorboard/defs:zipper.bzl", "tensorboard_zip_file")

licenses(["notice"])  # Apache 2.0

exports_files([
    "LICENSE",
])

package_group(
    name = "internal",
    packages = ["//tensorboard/..."],
)

py_binary(
    name = "tensorboard",
    srcs = ["main.py"],
    main = "main.py",
    srcs_version = "PY2AND3",
    deps = [
        ":util",
        ":version",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_file_inspector",
        "//tensorboard/plugins/audio:audio_plugin",
        "//tensorboard/plugins/core:core_plugin",
        "//tensorboard/plugins/distribution:distributions_plugin",
        "//tensorboard/plugins/graph:graphs_plugin",
        "//tensorboard/plugins/histogram:histograms_plugin",
        "//tensorboard/plugins/image:images_plugin",
        "//tensorboard/plugins/projector:projector_plugin",
        "//tensorboard/plugins/scalar:scalars_plugin",
        "//tensorboard/plugins/text:text_plugin",
        "@org_pocoo_werkzeug//:werkzeug",
    ],
)

py_binary(
    name = "version",
    srcs = ["version.py"],
    srcs_version = "PY2AND3",
)

tensorboard_zip_file(
    name = "webfiles",
    deps = [":assets"],
)

ts_web_library(
    name = "assets",
    srcs = [
        "//tensorboard/components:index.html",
        "//tensorboard/components:trace_viewer_index.html",
    ],
    path = "/",
)

py_library(
    name = "expect_numpy_installed",
    # This is a dummy rule used as a numpy dependency in open-source.
    # We expect numpy to already be installed on the system, e.g. via
    # `pip install numpy`
)

py_library(
    name = "expect_sqlite3_installed",
    # This is a dummy rule used as a sqlite3 dependency in open-source.
    # We expect sqlite3 to already be present, as it is part of the standard
    # library.
)

py_library(
    name = "expect_tensorflow_installed",
    # This is a dummy rule used as a TensorFlow dependency in open-source.
    # We expect TensorFlow to already be installed on the system, e.g. via
    # `pip install tensorflow`
)

filegroup(
    name = "ts_web_library_default_typings",
    srcs = [
        # Ordering probably matters.
        "@com_microsoft_typescript//:lib.es6.d.ts",
        "@io_angular_clutz//:src/resources/closure.lib.d.ts",
        "//tensorboard/defs:clutz.d.ts",
    ],
    visibility = ["//visibility:public"],
)

py_library(
    name = "test_util",
    testonly = 1,
    srcs = ["test_util.py"],
    srcs_version = "PY2AND3",
)

py_library(
    name = "util",
    srcs = ["util.py"],
    srcs_version = "PY2AND3",
    deps = ["//tensorboard:expect_tensorflow_installed"],
)

py_test(
    name = "util_test",
    size = "small",
    srcs = ["util_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":test_util",
        ":util",
        "//tensorboard:expect_tensorflow_installed",
        "@six_archive//:six",
    ],
)
