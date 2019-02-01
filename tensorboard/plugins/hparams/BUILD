# Description:
# TensorBoard plugin for hparams

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:protos.bzl", "tb_proto_library")

exports_files(["LICENSE"])

py_library(
    name = "hparams_plugin",
    srcs = [
        "backend_context.py",
        "get_experiment.py",
        "hparams_plugin.py",
        "list_metric_evals.py",
        "list_session_groups.py",
        "metrics.py",
    ],
    srcs_version = "PY2AND3",
    visibility = ["//visibility:public"],
    deps = [
        ":error",
        ":metadata",
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/compat:tensorflow",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/scalar:metadata",
        "//tensorboard/plugins/scalar:scalars_plugin",
        "//tensorboard/util",
        "@com_google_protobuf//:protobuf_python",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_attrs",
        "@org_pythonhosted_six",
    ],
)

py_test(
    name = "list_session_groups_test",
    size = "small",
    srcs = [
        "list_session_groups_test.py",
    ],
    deps = [
        ":hparams_plugin",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/backend/event_processing:event_multiplexer",
    ],
)

py_test(
    name = "list_metric_evals_test",
    size = "small",
    srcs = [
        "list_metric_evals_test.py",
    ],
    deps = [
        ":hparams_plugin",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_test(
    name = "backend_context_test",
    size = "small",
    srcs = [
        "backend_context_test.py",
    ],
    deps = [
        ":hparams_plugin",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:event_accumulator",
        "//tensorboard/backend/event_processing:event_multiplexer",
    ],
)

# To run the UI tests:
#
# bazel run //tensorboard/plugins/hparams:web_components_tests
#
# This will launch a webserver and print the port it listens on to stdout.
# Open a browser and navigate to that port. Click on the
# "/web_components_tests/web_components_tests.html" link. This will run the
# tests and show the results in the browser.
#
# How to add a new component test:
# 1. Add a 'test' subdir to the component dir: ./tf_hparams_<component>/test/
#    and put the test in a a file named: tf-hparams-<component>-test.html in
#    that directory.
# 2. Add a 'test_lib' tf_web_library rule to the BUILD file of the component
#    that contains the test.
# 3. Update the 'web_components_tests.html' file to load
#    '../tf-hparams-<component>/test/tf-hparams-<component>-test.html"
# 4. Add "//tensorboard/plugins/hparams/tf_hparams_<component>:test_lib"
#    as a dependency to the rule below.
#
# TODO(erez): Simplify adding a new test. It should not require touching so many files.
tf_web_library(
    name = "web_components_tests",
    testonly = 1,
    srcs = [
        "web_components_tests.html",
    ],
    path = "/web_components_tests",
    deps = [
        # This is not really a dependency, but we have it here so that
        # building the test would make sure the dashboard builds.
        "//tensorboard/plugins/hparams/tf_hparams_dashboard",
        "//tensorboard/plugins/hparams/tf_hparams_parallel_coords_plot:test_lib",
        "//tensorboard/plugins/hparams/tf_hparams_query_pane:test_lib",
        "//tensorboard/plugins/hparams/tf_hparams_scale_and_color_controls:test_lib",
        "//tensorboard/plugins/hparams/tf_hparams_utils:test_lib",
        "//tensorboard/plugins/hparams/tf_hparams_google_analytics_tracker:test_lib",
        "//tensorboard/components/tf_imports:web_component_tester",
        "//tensorboard/components/tf_imports:webcomponentsjs",
    ],
)

py_binary(
    name = "hparams_demo",
    srcs = ["hparams_demo.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/plugins/scalar:summary",
        "@org_pythonhosted_six",
    ],
)

py_binary(
    name = "hparams_util",
    srcs = ["hparams_util.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "@com_google_protobuf//:protobuf_python",
        "@org_pythonhosted_six",
    ],
)

sh_test(
    name = "hparams_util_test",
    srcs = ["hparams_util_test.sh"],
    data = [
        ":hparams_util",
    ],
)

py_library(
    name = "summary",
    srcs = ["summary.py"],
    srcs_version = "PY2AND3",
    visibility = [
        "//visibility:public",
    ],
    deps = [
        ":metadata",
        ":protos_all_py_pb2",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)

py_test(
    name = "summary_test",
    srcs = ["summary_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":protos_all_py_pb2",
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":error",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)

py_library(
    name = "error",
    srcs = ["error.py"],
    srcs_version = "PY2AND3",
)

tb_proto_library(
    name = "protos_all",
    srcs = [
        "api.proto",
        "hparams_util.proto",
        "plugin_data.proto",
    ],
    visibility = ["//visibility:public"],
)
