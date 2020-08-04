load("//tensorboard/defs:defs.bzl", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "schema_d_ts",
    srcs = [
        "schema.d.ts",
    ],
)

tf_ts_library(
    name = "tf_hparams_query_pane",
    srcs = [
        "tf-hparams-query-pane.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_utils",
        "@npm//@polymer/decorators",
        "@npm//@polymer/paper-checkbox",
        "@npm//@polymer/paper-dropdown-menu",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-item",
        "@npm//@polymer/paper-listbox",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//@vaadin/vaadin-split-layout",
        "@npm//lodash",
    ],
)

# Test disabled during migration to Polymer 3.

# tf_web_test(
#     name = "test",
#     src = "/tf-hparams-query-pane/test/tf-hparams-query-pane-test.html",
#     tags = ["manual"],
#     web_library = ":test_lib",
# )
#
# tf_web_library(
#     name = "test_lib",
#     testonly = 1,
#     srcs = [
#         "test/tf-hparams-query-pane-test.html",
#     ],
#     path = "/tf-hparams-query-pane",
#     deps = [
#         ":tf_hparams_query_pane",
#         "//tensorboard/components/tf_imports:polymer",
#         "//tensorboard/components/tf_imports:web_component_tester",
#         "//tensorboard/plugins/hparams/tf_hparams_backend",
#     ],
# )
