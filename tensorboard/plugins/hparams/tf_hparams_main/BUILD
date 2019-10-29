package(default_visibility = ["//visibility:public"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_main",
    srcs = [
        "tf-hparams-main.html",
    ],
    path = "/tf-hparams-main",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:vaadin_split_layout",
        "//tensorboard/plugins/hparams/tf_hparams_google_analytics_tracker",
        "//tensorboard/plugins/hparams/tf_hparams_query_pane",
        "//tensorboard/plugins/hparams/tf_hparams_sessions_pane",
    ],
)

# webcomponent_library version of the web app. Allows embedding the plugin in
# another web app.
tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_main"],
    visibility = ["//tensorboard/plugins/hparams/external_users:whitelist"],
    destdir = "tf-hparams-main",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/components/tf_imports_google:lib",
        "//tensorboard/plugins/hparams/tf_hparams_google_analytics_tracker:legacy",
        "//tensorboard/plugins/hparams/tf_hparams_query_pane:legacy",
        "//tensorboard/plugins/hparams/tf_hparams_sessions_pane:legacy",
    ],
)
