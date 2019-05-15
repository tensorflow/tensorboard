package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

py_library(
    name = "interactive_inference_plugin",
    srcs = ["interactive_inference_plugin.py"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard/backend:http_util",
        "//tensorboard/plugins:base_plugin",
        "//tensorboard/plugins/interactive_inference/utils:common_utils",
        "//tensorboard/plugins/interactive_inference/utils:inference_utils",
        "//tensorboard/plugins/interactive_inference/utils:platform_utils",
        "//tensorboard/util:tb_logging",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "interactive_inference_plugin_loader",
    srcs = ["interactive_inference_plugin_loader.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":interactive_inference_plugin",
        "//tensorboard/plugins:base_plugin",
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
        "@org_pythonhosted_mock",
        "@org_pythonhosted_six",
    ],
)
