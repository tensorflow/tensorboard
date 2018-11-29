package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "demo",
    srcs = ["index.html"],
    path = "/tf-audio-dashboard/demo",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/demo:demo_data",
        "//tensorboard/plugins/audio/tf_audio_dashboard",
        "//tensorboard/plugins/audio/tf_audio_dashboard/demo/data",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)
