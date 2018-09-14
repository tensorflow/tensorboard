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

py_test(
    name = "debug_graphs_helper_test",
    size = "small",
    srcs = ["debug_graphs_helper_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":debug_graphs_helper",
        "//tensorboard:expect_tensorflow_installed",
        "@org_python_pypi_portpicker",
    ],
)

py_library(
    name = "tensor_helper",
    srcs = ["tensor_helper.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":health_pill_calc",
        "//tensorboard:util",
        "//tensorboard:expect_numpy_installed",
    ],
)

py_test(
    name = "tensor_helper_test",
    size = "small",
    srcs = ["tensor_helper_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":tensor_helper",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins/beholder:im_util",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "tensor_store",
    srcs = ["tensor_store.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":tensor_helper",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "tensor_store_test",
    size = "small",
    srcs = ["tensor_store_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":tensor_store",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins/beholder:im_util",
    ],
)

py_library(
    name = "comm_channel",
    srcs = ["comm_channel.py"],
    srcs_version = "PY2AND3",
    deps = [
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "comm_channel_test",
    size = "small",
    srcs = ["comm_channel_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":comm_channel",
        "//tensorboard:expect_tensorflow_installed",
    ],
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
    name = "health_pill_calc",
    srcs = ["health_pill_calc.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard:expect_numpy_installed",
    ],
)

py_test(
    name = "health_pill_calc_test",
    size = "small",
    srcs = ["health_pill_calc_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":health_pill_calc",
        "//tensorboard:expect_numpy_installed",
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

py_library(
    name = "interactive_debugger_server_lib",
    srcs = ["interactive_debugger_server_lib.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":comm_channel",
        ":debug_graphs_helper",
        ":events_writer_manager",
        ":numerics_alert",
        ":tensor_helper",
        ":tensor_store",
        "//tensorboard:expect_tensorflow_installed",
        "@org_pythonhosted_six",
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
        ":tensor_store",
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

py_test(
    name = "interactive_debugger_plugin_test",
    size = "medium",
    srcs = ["interactive_debugger_plugin_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":interactive_debugger_plugin",
        "//tensorboard:expect_numpy_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
        "@org_python_pypi_portpicker",
        "@org_pythonhosted_six",
    ],
)

## Debugger Plugin: Non-interactive, for Health Pills in Graph Dashboard. ##
py_library(
    name = "debugger_plugin",
    srcs = ["debugger_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":constants",
        ":debugger_server_lib",
        "//tensorboard:expect_futures_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:http_util",
        "//tensorboard/backend/event_processing:event_file_loader",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

## Debugger Plugin: for the interactive Debugger Dashboard. ##
py_library(
    name = "interactive_debugger_plugin",
    srcs = ["interactive_debugger_plugin.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":constants",
        ":debug_graphs_helper",
        ":interactive_debugger_server_lib",
        "//tensorboard:expect_futures_installed",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend:http_util",
        "//tensorboard/backend:process_graph",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "debugger_plugin_loader",
    srcs = ["debugger_plugin_loader.py"],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":debugger_plugin",
        ":interactive_debugger_plugin",
        "//tensorboard/plugins:base_plugin",
        "@org_pythonhosted_six",
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
