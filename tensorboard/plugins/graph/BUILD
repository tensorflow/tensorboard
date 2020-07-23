# Description:
# TensorBoard plugin for graphs

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

## Graphs Plugin ##
py_library(
    name = "graphs_plugin",
    srcs = ["graphs_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":graph_util",
        ":keras_util",
        ":metadata",
        "//tensorboard:context",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/backend:process_graph",
        "//tensorboard/backend/event_processing:tag_types",
        "//tensorboard/data:provider",
        "//tensorboard/plugins:base_plugin",
        "@com_google_protobuf//:protobuf_python",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "graphs_plugin_test",
    size = "small",
    srcs = ["graphs_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [":graphs_plugin_test_lib"],
)

py_library(
    name = "graphs_plugin_test_lib",
    testonly = True,
    srcs = ["graphs_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":graphs_plugin",
        "//tensorboard:context",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@com_google_protobuf//:protobuf_python",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "graphs_plugin_v2_test",
    size = "small",
    srcs = ["graphs_plugin_v2_test.py"],
    main = "graphs_plugin_v2_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":graphs_plugin",
        ":graphs_plugin_test_lib",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "@com_google_protobuf//:protobuf_python",
    ],
)

# TODO(#2007): Remove this after pruning unnecessary TensorFlow deps in main test
py_test(
    name = "graphs_plugin_notf_test",
    size = "small",
    srcs = ["graphs_plugin_test.py"],
    main = "graphs_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":graphs_plugin",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/compat:no_tensorflow",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@com_google_protobuf//:protobuf_python",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "keras_util",
    srcs = ["keras_util.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:private"],
    deps = [
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/compat/tensorflow_stub",
    ],
)

py_test(
    name = "keras_util_test",
    size = "small",
    srcs = ["keras_util_test.py"],
    main = "keras_util_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":keras_util",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "@com_google_protobuf//:protobuf_python",
    ],
)

py_library(
    name = "graph_util",
    srcs = ["graph_util.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:private"],
)

py_test(
    name = "graph_util_test",
    size = "small",
    srcs = ["graph_util_test.py"],
    main = "graph_util_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":graph_util",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "@com_google_protobuf//:protobuf_python",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY2AND3",
)
