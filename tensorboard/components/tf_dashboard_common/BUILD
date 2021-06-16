load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_dashboard_common",
    srcs = [
        "array-update-helper.ts",
        "dashboard-style.ts",
        "data-loader-behavior.ts",
        "run-color-style.ts",
        "scrollbar-style.ts",
        "tensorboard-color.ts",
        "tf-dashboard-layout.ts",
        "tf-downloader.ts",
        "tf-dropdown-trigger.ts",
        "tf-filterable-checkbox-dropdown.ts",
        "tf-filterable-checkbox-list.ts",
        "tf-multi-checkbox.ts",
        "tf-no-data-warning.ts",
        "tf-option-selector.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:dark_mode_mixin",
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/polymer:paper_inky_focus_behavior",
        "//tensorboard/components/polymer:register_style_dom_module",
        "//tensorboard/components/polymer:utils_mixin",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/vz_sorting",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
    ],
)
