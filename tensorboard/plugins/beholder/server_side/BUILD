package(default_visibility = ["//visibility:public"])

licenses(["notice"])  # Apache 2.0

py_library(
    name = "beholder_plugin",
    srcs = [
        "beholder_plugin.py",
        "//tensorboard/plugins/beholder:shared_config.py",
    ],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard/plugins/beholder",
        "//tensorboard/plugins/beholder:file_system_tools",
        "//tensorboard/plugins/beholder:im_util",
        "@org_pocoo_werkzeug",
        "@org_tensorflow_tensorboard//tensorboard/backend:http_util",
        "@org_tensorflow_tensorboard//tensorboard/backend/event_processing:event_accumulator",
        "@org_tensorflow_tensorboard//tensorboard/backend/event_processing:plugin_asset_util",
        "@org_tensorflow_tensorboard//tensorboard/plugins:base_plugin",
    ],
)
