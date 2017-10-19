# Description:
# TensorBoard plugin for tensors and tensor variance for an entire graph.

package(default_visibility = ["//visibility:public"])

licenses(["notice"])  # Apache 2.0

exports_files(["LICENSE"])

py_library(
    name = "file_system_tools",
    srcs = ["file_system_tools.py"],
    data = ["resources"],
    srcs_version = "PY2AND3",
)

py_library(
    name = "im_util",
    srcs = ["im_util.py"],
    data = ["resources"],
    srcs_version = "PY2AND3",
    deps = [":file_system_tools"],
)

py_library(
    name = "visualizer",
    srcs = [
        "shared_config.py",
        "visualizer.py",
    ],
    srcs_version = "PY2AND3",
    deps = [
        ":file_system_tools",
        ":im_util",
    ],
)

py_library(
    name = "video_writing",
    srcs = ["video_writing.py"],
    srcs_version = "PY2AND3",
    deps = [
        ":im_util",
    ],
)

py_library(
    name = "beholder",
    srcs = [
        "beholder.py",
        "shared_config.py",
    ],
    data = ["resources"],
    srcs_version = "PY2AND3",
    deps = [
        ":file_system_tools",
        ":im_util",
        ":video_writing",
        ":visualizer",
        "//tensorboard/backend/event_processing:plugin_asset_util",
    ],
)
