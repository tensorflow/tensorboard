# Description:
# TensorBoard plugin for distributions

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

exports_files(["LICENSE"])

## Distributions Plugin ##
py_library(
    name = "distributions_plugin",
    srcs = ["distributions_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":compressor",
        ":metadata",
        "//tensorboard:plugin_util",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/histogram:histograms_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "distributions_plugin_test",
    size = "small",
    srcs = ["distributions_plugin_test.py"],
    main = "distributions_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":compressor",
        ":distributions_plugin",
        "//tensorboard:context",
        "//tensorboard:errors",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/backend/event_processing:tag_types",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/histogram:summary",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

# TODO(#2007): Remove this after pruning unnecessary TensorFlow deps in main test
py_test(
    name = "distributions_plugin_notf_test",
    size = "small",
    srcs = ["distributions_plugin_test.py"],
    main = "distributions_plugin_test.py",
    srcs_version = "PY2AND3",
    deps = [
        ":compressor",
        ":distributions_plugin",
        "//tensorboard:context",
        "//tensorboard:errors",
        "//tensorboard:expect_tensorflow_installed",
        "//tensorboard/backend/event_processing:data_provider",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/backend/event_processing:tag_types",
        "//tensorboard/compat:no_tensorflow",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/histogram:summary",
        "//tensorboard/util:test_util",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)

py_library(
    name = "compressor",
    srcs = ["compressor.py"],
    srcs_version = "PY2AND3",
    deps = ["//tensorboard:expect_numpy_installed"],
)

py_test(
    name = "compressor_test",
    size = "small",
    srcs = ["compressor_test.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":compressor",
        "//tensorboard:expect_tensorflow_installed",
    ],
)

py_library(
    name = "metadata",
    srcs = ["metadata.py"],
    srcs_version = "PY2AND3",
)
