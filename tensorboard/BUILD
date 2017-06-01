# Description:
# TensorBoard, a dashboard for investigating TensorFlow

package(default_visibility = ["//third_party/tensorflow:internal"])

licenses(["notice"])  # Apache 2.0

py_binary(
    name = "tensorboard",
    srcs = ["tensorboard.py"],
    data = [":assets"],
    srcs_version = "PY2AND3",
    deps = [
        "//tensorboard/backend:application",
        "//tensorboard/backend/event_processing:event_file_inspector",
        "//tensorboard/plugins/audio:audio_plugin",
        "//tensorboard/plugins/histograms:histograms_plugin",
        "//tensorboard/plugins/images:images_plugin",
        "//tensorboard/plugins/projector:projector_plugin",
        "//tensorboard/plugins/scalars:scalars_plugin",
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
