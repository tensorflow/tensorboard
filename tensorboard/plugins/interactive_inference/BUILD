package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

py_library(
    name = "interactive_inference_plugin",
    srcs = ["interactive_inference_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard/plugins/interactive_inference/utils:common_utils",
        "//tensorboard/plugins/interactive_inference/utils:inference_utils",
        "//tensorboard/plugins/interactive_inference/utils:platform_utils",
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "interactive_inference_plugin_test",
    size = "small",
    srcs = ["interactive_inference_plugin_test.py"],
    deps = [
        ":interactive_inference_plugin",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_multiplexer",
        "//tensorboard/plugins/interactive_inference/utils:inference_utils",
        "//tensorboard/plugins/interactive_inference/utils:platform_utils",
        "//tensorboard/plugins/interactive_inference/utils:test_utils",
        "@org_pocoo_werkzeug",
        "@org_pythonhosted_six",
    ],
)
