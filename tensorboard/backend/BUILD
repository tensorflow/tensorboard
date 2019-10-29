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
        "//tensorboard/compat:tensorflow",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "http_util_test",
    size = "small",
    srcs = ["http_util_test.py"],
    srcs_version = "PY2AND3",
    tags = ["support_notf"],
    deps = [
        ":http_util",
        "//tensorboard:test",
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
        "//tensorboard/compat:tensorflow",
    ],
)

py_test(
    name = "json_util_test",
    size = "small",
    srcs = ["json_util_test.py"],
    srcs_version = "PY2AND3",
    tags = ["support_notf"],
    deps = [
        ":json_util",
        "//tensorboard:test",
    ],
)

py_library(
    name = "application",
    srcs = ["application.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":empty_path_redirect",
        ":experiment_id",
        ":http_util",
        ":path_prefix",
        "//tensorboard:errors",
        "//tensorboard:expect_sqlite3_installed",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:db_import_multiplexer",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins/core:core_plugin",
        "//tensorboard/plugins/histogram:metadata",
        "//tensorboard/plugins/image:metadata",
        "//tensorboard/plugins/pr_curve:metadata",
        "//tensorboard/plugins/scalar:metadata",
        "//tensorboard/util:tb_logging",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "application_test",
    size = "small",
    srcs = ["application_test.py"],
    srcs_version = "PY2AND3",
    tags = ["support_notf"],
    deps = [
        ":application",
        "//tensorboard:errors",
        "//tensorboard:plugin_util",
        "//tensorboard:test",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_mock",
    ],
)

py_library(
    name = "empty_path_redirect",
    srcs = ["empty_path_redirect.py"],
    srcs_version = "PY2AND3",
)

py_test(
    name = "empty_path_redirect_test",
    size = "small",
    srcs = ["empty_path_redirect_test.py"],
    srcs_version = "PY2AND3",
    tags = ["support_notf"],
    deps = [
        ":empty_path_redirect",
        "//tensorboard:test",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "experiment_id",
    srcs = ["experiment_id.py"],
    srcs_version = "PY2AND3",
)

py_test(
    name = "experiment_id_test",
    srcs = ["experiment_id_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":experiment_id",
        "//tensorboard:test",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "path_prefix",
    srcs = ["path_prefix.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:errors",
    ],
)

py_test(
    name = "path_prefix_test",
    size = "small",
    srcs = ["path_prefix_test.py"],
    srcs_version = "PY2AND3",
    tags = ["support_notf"],
    deps = [
        ":path_prefix",
        "//tensorboard:errors",
        "//tensorboard:test",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "process_graph",
    srcs = ["process_graph.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/compat:tensorflow",
    ],
)
