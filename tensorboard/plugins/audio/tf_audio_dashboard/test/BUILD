package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:mocha_test.bzl", "mocha_test")

licenses(["notice"])  # Apache 2.0

# run :test_mocha_devserver to debug locally
mocha_test(
  name = "test",
    srcs = [
        "audioDashboardTests.ts",
        "tests.html",
    ],
    path = "/tf-audio-dashboard/test",
    test_file = "tests.html",
    deps = [
        "//tensorboard/plugins/audio/tf_audio_dashboard",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/demo:demo_data",
    ],
    # TODO(@dandelionmane): Fix this failing test
    tags = ["manual"],
)

