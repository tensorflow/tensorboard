# Description:
# A plugin system for TensorBoard

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "base_plugin",
    srcs = ["base_plugin.py"],
    srcs_version = "PY2AND3",
)

py_library(
  name = "api",
  srcs = ["__init__.py"],
  srcs_version = "PY2AND3",
  deps = [
      "//tensorboard/plugins/audio:api",
      "//tensorboard/plugins/histogram:api",
      "//tensorboard/plugins/image:api",
      "//tensorboard/plugins/projector:api",
      "//tensorboard/plugins/scalar:api",
      "//tensorboard/plugins/text:api"
    ])
