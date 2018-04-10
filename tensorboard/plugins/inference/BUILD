package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

# TensorFlow Inference Plugin
#
# This is the first of (hopefully many!) inference plugins.
# This plugin takes a single tf.Example proto and plots how mutating
# the example proto affects the inference result.
py_library(
    name = "inference_plugin",
    srcs = ["inference_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard/plugins/inference/utils:common_utils",
        "//tensorboard/plugins/inference/utils:oss_utils",
        "//tensorboard/plugins/inference/utils:inference_utils",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "inference_plugin_test",
    size = "small",
    srcs = ["inference_plugin_test.py"],
    deps = [
        ":inference_plugin",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins/inference/utils:test_utils",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)
