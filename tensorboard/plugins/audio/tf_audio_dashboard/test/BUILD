package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "test",
    srcs = [
        "audioDashboardTests.ts",
        "tests.html",
    ],
    path = "/tf-audio-dashboard/test",
    deps = [
        "//tensorboard/plugins/audio/tf_audio_dashboard",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:web_component_tester",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/demo:demo_data",
    ],
)

