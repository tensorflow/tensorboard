load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "tf_hparams_table_view",
    srcs = [
        "tf-hparams-table-view.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:dom",
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_session_group_details",
        "//tensorboard/plugins/hparams/polymer3/tf_hparams_utils",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@vaadin/vaadin-grid",
    ],
)
