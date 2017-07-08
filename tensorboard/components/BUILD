package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tensorboard",
    srcs = [
        "analytics.html",
        "tensorboard.html",
    ],
    path = "/",
    deps = [
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/components/tf_tensorboard",
        "//tensorboard/plugins/audio/tf_audio_dashboard",
        "//tensorboard/plugins/distribution/tf_distribution_dashboard",
        "//tensorboard/plugins/graph/tf_graph_dashboard",
        "//tensorboard/plugins/histogram/tf_histogram_dashboard",
        "//tensorboard/plugins/image/tf_image_dashboard",
        "//tensorboard/plugins/projector/vz_projector",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard",
        "//tensorboard/plugins/text/tf_text_dashboard",
    ],
)

tensorboard_html_binary(
    name = "index",
    input_path = "/tensorboard.html",
    output_path = "/index.html",
    deps = [":tensorboard"],
)

ts_web_library(
    name = "trace_viewer",
    srcs = ["trace_viewer.html"],
    path = "/",
    deps = [
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/components/tf_trace_viewer",
    ],
)

tensorboard_html_binary(
    name = "trace_viewer_index",
    input_path = "/trace_viewer.html",
    output_path = "/trace_viewer_index.html",
    deps = [":trace_viewer"],
)
