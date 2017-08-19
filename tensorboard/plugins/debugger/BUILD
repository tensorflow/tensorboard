# Description:
# TensorBoard Debugger Plugin (TDP): Allows debugging TF runtime through
# integration with TensorFlow Debugger (tfdbg).

package(default_visibility = [":internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

package_group(
    name = "internal",
    packages = ["//tensorboard/..."],
)

py_library(
    name = "constants",
    srcs = ["constants.py"],
    srcs_version = "PY2AND3",
)

py_library(
    name = "debug_graphs_helper",
    srcs = ["debug_graphs_helper.py"],
    srcs_version = "PY2AND3",
)

# TODO(cais): Incorporate debug_graphs_helper into debug_data.py in tensorflow.
# TODO(cais): Add unit tests for code in debug_graphs_helper.py.

py_library(
    name = "events_writer_manager",
    srcs = ["events_writer_manager.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "debugger_plugin_testlib",
    srcs = ["debugger_plugin_testlib.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":constants",
        ":debugger_plugin",
        ":debugger_server_lib",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "events_writer_manager_test",
    size = "small",
    srcs = ["events_writer_manager_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":debugger_plugin",
        ":debugger_plugin_testlib",
        ":events_writer_manager",
        ":numerics_alert",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "@org_python_pypi_portpicker",
    ],
)

py_library(
    name = "numerics_alert",
    srcs = ["numerics_alert.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":constants",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "numerics_alert_test",
    size = "small",
    srcs = ["numerics_alert_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":constants",
        ":numerics_alert",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "debugger_server_lib",
    srcs = ["debugger_server_lib.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":constants",
        ":events_writer_manager",
        ":numerics_alert",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "debugger_server_test",
    size = "small",
    srcs = [
        "debugger_server_test.py",
    ],
    srcs_version = "PY2AND3",
    deps = [
        ":constants",
        ":debugger_server_lib",
        ":numerics_alert",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "session_debug_test",
    size = "medium",
    srcs = ["session_debug_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":constants",
        ":debugger_server_lib",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "@org_python_pypi_portpicker",
    ],
)

## TensorFlow Debugger Plugin ##
py_library(
    name = "debugger_plugin",
    srcs = ["debugger_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":constants",
        ":debug_graphs_helper",
        ":debugger_server_lib",
        "//tensorboard:expect_futures_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:http_util",
        "//tensorboard/backend:process_graph",
        "//tensorboard/backend/event_processing:event_file_loader",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "debugger_plugin_test",
    size = "small",
    srcs = ["debugger_plugin_test.py"],
    main = "debugger_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":debugger_plugin",
        ":debugger_plugin_testlib",
        ":numerics_alert",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "@org_python_pypi_portpicker",
    ],
)
