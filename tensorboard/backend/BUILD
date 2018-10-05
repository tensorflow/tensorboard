# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "http_util",
    srcs = ["http_util.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":json_util",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "http_util_test",
    size = "small",
    srcs = ["http_util_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":http_util",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "json_util",
    srcs = ["json_util.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "json_util_test",
    size = "small",
    srcs = ["json_util_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":json_util",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "application",
    srcs = ["application.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":http_util",
        "//tensorboard:db",
        "//tensorboard:expect_sqlite3_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:db_import_multiplexer",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins/core:core_plugin",
        "//tensorboard/plugins/histogram:metadata",
        "//tensorboard/plugins/image:metadata",
        "//tensorboard/plugins/pr_curve:metadata",
        "//tensorboard/plugins/scalar:metadata",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "application_test",
    size = "small",
    srcs = ["application_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":application",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "process_graph",
    srcs = ["process_graph.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ],
)
