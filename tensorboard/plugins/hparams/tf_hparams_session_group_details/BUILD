load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_session_group_details",
    srcs = [
        "tf-hparams-session-group-details.html",
    ],
    path = "/tf-hparams-session-group-details",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard:tf_scalar_card",
        "@org_polymer_iron_flex_layout",
        "@org_polymer_iron_resizable_behavior",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_session_group_details"],
    visibility = ["//visibility:public"],
    destdir = "tf-hparams-session-group-details",
    deps = [
        "//tensorboard/components/tf_backend:legacy",
        "//tensorboard/components/tf_color_scale:legacy",
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/plugins/hparams/tf_hparams_utils:legacy",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard:tf_scalar_card_legacy",
        "//third_party/javascript/polymer/v2/iron-flex-layout:lib",
        "//third_party/javascript/polymer/v2/iron-resizable-behavior:lib",
    ],
)
