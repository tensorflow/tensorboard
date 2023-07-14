# Description:
# TensorBoard, a dashboard for investigating TensorFlow

load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "http_util",
    srcs = ["http_util.py"],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
    deps = [
        ":json_util",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "http_util_test",
    size = "small",
    srcs = ["http_util_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":http_util",
        "//tensorboard:test",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "json_util",
    srcs = ["json_util.py"],
    srcs_version = "PY3",
)

py_test(
    name = "json_util_test",
    size = "small",
    srcs = ["json_util_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":json_util",
        "//tensorboard:test",
    ],
)

py_library(
    name = "application",
    srcs = ["application.py"],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
    deps = [
        ":auth_context_middleware",
        ":client_feature_flags",
        ":empty_path_redirect",
        ":experiment_id",
        ":experimental_plugin",
        ":http_util",
        ":path_prefix",
        ":security_validator",
        "//tensorboard:errors",
        "//tensorboard:plugin_util",
        "//tensorboard/plugins/core:core_plugin",
        "//tensorboard/util:tb_logging",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "application_test",
    size = "small",
    srcs = ["application_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":application",
        "//tensorboard:auth",
        "//tensorboard:errors",
        "//tensorboard:plugin_util",
        "//tensorboard:test",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "auth_context_middleware",
    srcs = ["auth_context_middleware.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard:auth",
        "//tensorboard:context",
    ],
)

py_test(
    name = "auth_context_middleware_test",
    size = "small",
    srcs = ["auth_context_middleware_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":auth_context_middleware",
        "//tensorboard:auth",
        "//tensorboard:context",
        "//tensorboard:test",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "empty_path_redirect",
    srcs = ["empty_path_redirect.py"],
    srcs_version = "PY3",
)

py_test(
    name = "empty_path_redirect_test",
    size = "small",
    srcs = ["empty_path_redirect_test.py"],
    srcs_version = "PY3",
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
    srcs_version = "PY3",
)

py_test(
    name = "experiment_id_test",
    srcs = ["experiment_id_test.py"],
    srcs_version = "PY3",
    deps = [
        ":experiment_id",
        "//tensorboard:test",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "experimental_plugin",
    srcs = ["experimental_plugin.py"],
    srcs_version = "PY3",
)

py_library(
    name = "path_prefix",
    srcs = ["path_prefix.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard:errors",
    ],
)

py_test(
    name = "path_prefix_test",
    size = "small",
    srcs = ["path_prefix_test.py"],
    srcs_version = "PY3",
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
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
)

py_library(
    name = "security_validator",
    srcs = ["security_validator.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard/util:tb_logging",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "security_validator_test",
    size = "small",
    srcs = ["security_validator_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":security_validator",
        "//tensorboard:test",
        "//tensorboard/util:tb_logging",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "client_feature_flags",
    srcs = ["client_feature_flags.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorboard:context",
        "//tensorboard:errors",
    ],
)

py_test(
    name = "client_feature_flags_test",
    size = "small",
    srcs = ["client_feature_flags_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":client_feature_flags",
        "//tensorboard:errors",
        "//tensorboard:test",
        "@org_pocoo_werkzeug",
    ],
)
