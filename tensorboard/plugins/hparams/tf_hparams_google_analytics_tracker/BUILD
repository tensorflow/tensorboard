package(default_visibility = ["//visibility:public"])

load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_google_analytics_tracker",
    srcs = [
        "tf-hparams-google-analytics-tracker.html",
    ],
    path = "/tf-hparams-google-analytics-tracker",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:polymer",
    ],
)

tf_web_test(
    name = "test",
    src = "/tf-hparams-google-analytics-tracker/test/tf-hparams-google-analytics-tracker-test.html",
    web_library = ":test_lib",
)

tf_web_library(
    name = "test_lib",
    testonly = 1,
    srcs = [
        "test/tf-hparams-google-analytics-tracker-test.html",
    ],
    path = "/tf-hparams-google-analytics-tracker",
    deps = [
        ":tf_hparams_google_analytics_tracker",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:web_component_tester",
    ],
)

# webcomponent_library version of the web app. Allows embedding the plugin in
# another web app.
tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_google_analytics_tracker"],
    destdir = "tf-hparams-google-analytics-tracker",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
    ],
)
