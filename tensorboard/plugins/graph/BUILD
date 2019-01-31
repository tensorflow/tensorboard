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
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/backend:http_util",
        "//tensorboard/backend:process_graph",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/compat:tensorflow",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "graphs_plugin_test",
    size = "small",
    srcs = ["graphs_plugin_test.py"],
    main = "graphs_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":graphs_plugin",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/compat/proto:protos_all_py_pb2",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)
