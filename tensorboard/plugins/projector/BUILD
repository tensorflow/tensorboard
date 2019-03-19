# Embedding Projector plugin.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

load("//tensorboard/defs:protos.bzl", "tb_proto_library")

py_library(
    name = "projector_plugin",
    srcs = ["projector_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":protos_all_py_pb2",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard/backend:http_util",
        "//tensorboard/compat:tensorflow",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:tb_logging",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "projector",
    srcs = ["__init__.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":projector_plugin",
        ":protos_all_py_pb2",
        "//tensorboard/compat:tensorflow",
    ],
)

py_test(
    name = "projector_api_test",
    size = "small",
    srcs = ["projector_api_test.py"],
    main = "projector_api_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":projector",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/util:test_util",
    ],
)

py_test(
    name = "projector_plugin_test",
    size = "small",
    srcs = ["projector_plugin_test.py"],
    main = "projector_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":projector_plugin",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
    ],
)

# TODO(#2007): Remove this after pruning unnecessary TensorFlow deps in main test
py_test(
    name = "projector_plugin_notf_test",
    size = "small",
    srcs = ["projector_plugin_test.py"],
    main = "projector_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":projector_plugin",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/compat:no_tensorflow",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
    ],
)

tb_proto_library(
    name = "protos_all",
    srcs = glob(["*.proto"]),
    visibility = ["//visibility:public"],
)
