# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = [":internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:zipper.bzl", "tensorboard_zip_file")

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])  # Needed for internal repo.

package_group(
    name = "internal",
    packages = ["//tensorboard/..."],
)

# The standard TensorBoard binary that serves the webapp.
py_binary(
    name = "tensorboard",
    srcs = ["main.py"],
    main = "main.py",
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":default",
        ":program",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

# The public TensorBoard python library, bundled with the pip package and
# available via 'import tensorboard as tb' once installed.
py_library(
    name = "lib",
    srcs = ["__init__.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":lazy",
        ":program",
        ":summary",
    ],
)

py_library(
    name = "program",
    srcs = ["program.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":util",
        ":version",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_file_inspector",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "program_test",
    size = "small",
    srcs = ["program_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":program",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "default",
    srcs = ["default.py"],
    data = ["webfiles.zip"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/audio:audio_plugin",
        "//tensorboard/plugins/beholder:beholder_plugin",
        "//tensorboard/plugins/core:core_plugin",
        "//tensorboard/plugins/custom_scalar:custom_scalars_plugin",
        "//tensorboard/plugins/debugger:debugger_plugin_loader",
        "//tensorboard/plugins/distribution:distributions_plugin",
        "//tensorboard/plugins/graph:graphs_plugin",
        "//tensorboard/plugins/histogram:histograms_plugin",
        "//tensorboard/plugins/image:images_plugin",
        "//tensorboard/plugins/interactive_inference:interactive_inference_plugin",
        "//tensorboard/plugins/pr_curve:pr_curves_plugin",
        "//tensorboard/plugins/profile:profile_plugin",
        "//tensorboard/plugins/projector:projector_plugin",
        "//tensorboard/plugins/scalar:scalars_plugin",
        "//tensorboard/plugins/text:text_plugin",
    ],
)

py_library(
    name = "version",
    srcs = ["version.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
)

tensorboard_zip_file(
    name = "webfiles",
    deps = [":assets"],
)

tf_web_library(
    name = "assets",
    srcs = [
        "//tensorboard/components:index.html",
        "//tensorboard/components:trace_viewer_index.html",
    ],
    path = "/",
    deps = [
        "//tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard:wit_assets",
        "@com_google_fonts_roboto",
    ],
)

py_library(
    name = "expect_numpy_installed",
    # This is a dummy rule used as a numpy dependency in open-source.
    # We expect numpy to already be installed on the system, e.g. via
    # `pip install numpy`
    visibility = ["//visibility:public"],
)

py_library(
    name = "expect_futures_installed",
    # This is a dummy rule used as a futures dependency in open-source.
    # We expect futures to already be installed on the system, e.g. via
    # `pip install futures`
    visibility = ["//visibility:public"],
)

py_library(
    name = "expect_sqlite3_installed",
    # This is a dummy rule used as a sqlite3 dependency in open-source.
    # We expect sqlite3 to already be present, as it is part of the standard
    # library.
    visibility = ["//visibility:public"],
)

py_library(
    name = "expect_tensorflow_installed",
    # This is a dummy rule used as a TensorFlow dependency in open-source.
    # We expect TensorFlow to already be installed on the system, e.g. via
    # `pip install tensorflow`
    visibility = ["//visibility:public"],
)

py_library(
    name = "tf_contrib_ffmpeg",
    # This is a dummy rule for the open source world, which indicates
    # that srcs dereference tf.contrib.ffmpeg.
    visibility = ["//visibility:public"],
)

filegroup(
    name = "tf_web_library_default_typings",
    srcs = [
        # Ordering probably matters.
        "@com_microsoft_typescript//:lib.es6.d.ts",
        "@io_angular_clutz//:src/resources/closure.lib.d.ts",
        "//tensorboard/defs:clutz.d.ts",
    ],
    visibility = ["//visibility:public"],
)

py_library(
    name = "data_compat",
    srcs = ["data_compat.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins/audio:metadata",
        "//tensorboard/plugins/histogram:metadata",
        "//tensorboard/plugins/image:metadata",
        "//tensorboard/plugins/scalar:metadata",
    ],
)

py_test(
    name = "data_compat_test",
    size = "small",
    srcs = ["data_compat_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":data_compat",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins/audio:metadata",
        "//tensorboard/plugins/audio:summary",
        "//tensorboard/plugins/histogram:metadata",
        "//tensorboard/plugins/histogram:summary",
        "//tensorboard/plugins/image:metadata",
        "//tensorboard/plugins/image:summary",
        "//tensorboard/plugins/scalar:metadata",
        "//tensorboard/plugins/scalar:summary",
    ],
)

py_library(
    name = "db",
    srcs = ["db.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":util",
        "//tensorboard:expect_sqlite3_installed",
    ],
)

py_test(
    name = "db_test",
    size = "medium",
    timeout = "short",
    srcs = ["db_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":db",
        ":test_util",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)

py_binary(
    name = "encode_png_benchmark",
    srcs = ["encode_png_benchmark.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":util",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "plugin_util",
    srcs = ["plugin_util.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "@org_mozilla_bleach",
        "@org_pythonhosted_markdown",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "plugin_util_test",
    size = "small",
    srcs = ["plugin_util_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":plugin_util",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "util",
    srcs = ["util.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard:tf_contrib_ffmpeg",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "util_test",
    size = "small",
    srcs = ["util_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":test_util",
        ":util",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "loader",
    srcs = ["loader.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":util",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "loader_test",
    size = "small",
    srcs = ["loader_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":loader",
        ":test_util",
        ":util",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "summary",
    srcs = ["summary.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/plugins/audio:summary",
        "//tensorboard/plugins/custom_scalar:summary",
        "//tensorboard/plugins/histogram:summary",
        "//tensorboard/plugins/image:summary",
        "//tensorboard/plugins/pr_curve:summary",
        "//tensorboard/plugins/scalar:summary",
        "//tensorboard/plugins/text:summary",
    ],
)

py_test(
    name = "summary_test",
    size = "small",
    srcs = ["summary_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":lib",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "test_util",
    testonly = 1,
    srcs = ["test_util.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":db",
        ":util",
        "//tensorboard:expect_sqlite3_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "lazy",
    srcs = ["lazy.py"],
    srcs_version = "PY2AND3",
)
