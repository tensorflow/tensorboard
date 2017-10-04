package(default_visibility = ["//visibility:public"])

py_library(
  name = "beholder_plugin",
  srcs = [
    "beholder_plugin.py",
    "//beholder:shared_config.py"
  ],
  srcs_version = "PY2AND3",
  deps = [
    "//beholder",
    "//beholder:im_util",
    "//beholder:file_system_tools",
    "@org_pocoo_werkzeug",
    "@org_tensorflow_tensorboard//tensorboard/backend:http_util",
    "@org_tensorflow_tensorboard//tensorboard/backend/event_processing:plugin_asset_util",
    "@org_tensorflow_tensorboard//tensorboard/backend/event_processing:event_accumulator",
    "@org_tensorflow_tensorboard//tensorboard/plugins:base_plugin",
  ],
)
