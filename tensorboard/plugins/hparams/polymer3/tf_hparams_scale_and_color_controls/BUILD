load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_hparams_scale_and_color_controls",
    srcs = [
        "tf-hparams-scale-and-color-controls.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_utils",
        "@npm//@polymer/decorators",
        "@npm//@polymer/paper-dropdown-menu",
        "@npm//@polymer/paper-item",
        "@npm//@polymer/paper-listbox",
        "@npm//@polymer/paper-radio-button",
        "@npm//@polymer/paper-radio-group",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//d3",
    ],
)

# Test disabled during migration to Polymer 3.

# tf_web_test(
#     name = "test",
#     src = "/tf-hparams-scale-and-color-controls/test/tf-hparams-scale-and-color-controls-test.html",
#     tags = ["manual"],
#     web_library = ":test_lib",
# )
#
# tf_web_library(
#     name = "test_lib",
#     testonly = 1,
#     srcs = [
#         "test/tf-hparams-scale-and-color-controls-test.html",
#     ],
#     path = "/tf-hparams-scale-and-color-controls",
#     deps = [
#         ":tf_hparams_scale_and_color_controls",
#         "//tensorboard/components/tf_imports:polymer",
#         "//tensorboard/components/tf_imports:web_component_tester",
#     ],
# )
