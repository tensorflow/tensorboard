# Description:
# TensorBoard nPMI Plugin: A plugin for inspecting nPMI calculations for trained
# models. nPMI is a technique presented in a paper (https://svn.spraakdata.gu.se/repos/gerlof/pub/www/Docs/npmi-pfd.pdfhttps://svn.spraakdata.gu.se/repos/gerlof/pub/www/Docs/npmi-pfd.pdf)
# presented by Gerlof Bouma.

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_library(
    name = "npmi_plugin",
    srcs = ["npmi_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":safe_encoder",
        "//tensorboard:errors",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:tensor_util",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "npmi_plugin_test",
    size = "small",
    srcs = ["npmi_plugin_test.py"],
    main = "npmi_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":npmi_plugin",
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard:plugin_util",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/util:test_util",
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
        "//tensorboard/compat",
        "//tensorboard/compat/proto:protos_all_py_pb2",
    ],
)

py_test(
    name = "summary_test",
    size = "small",
    srcs = ["summary_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":summary",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/compat",
        "//tensorboard/util:test_util",
    ],
)

py_library(
    name = "safe_encoder",
    srcs = ["safe_encoder.py"],
    srcs_version = "PY2AND3",
    visibility = [
        "//visibility:public",
    ],
    deps = [
    ],
)

py_test(
    name = "safe_encoder_test",
    size = "small",
    srcs = ["safe_encoder_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":safe_encoder",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/util:test_util",
    ],
)
