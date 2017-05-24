# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

py_binary(
    name = "tensorboard",
    srcs = ["tensorboard.py"],
    data = [":assets"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorflow/python:platform",
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_file_inspector",
        "//tensorboard/plugins/projector:projector_plugin",
        "//tensorboard/plugins/text:text_plugin",
        "@org_pocoo_werkzeug//:werkzeug",
    ],
)

filegroup(
    name = "assets",
    srcs = [
        "TAG",
        "//tensorboard/components:index.html",
    ],
)

package_group(
    name = "internal",
    packages = [
        "//tensorboard/...",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(
        ["**"],
        exclude = [
            "METADATA",
            "OWNERS",
            "tensorboard.google.bzl",
        ],
    ),
    tags = ["notsan"],
)

