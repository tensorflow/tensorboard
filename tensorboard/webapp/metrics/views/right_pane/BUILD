load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "settings_view_styles",
    src = "settings_view_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "saving_pins_checkbox_styles",
    src = "saving_pins_checkbox_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_ng_module(
    name = "right_pane",
    srcs = [
        "right_pane_component.ts",
        "right_pane_module.ts",
        "saving_pins_checkbox_component.ts",
        "settings_view_component.ts",
        "settings_view_container.ts",
    ],
    assets = [
        ":settings_view_styles",
        "settings_view_component.ng.html",
        ":saving_pins_checkbox_styles",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_button_toggle",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_select",
        "//tensorboard/webapp/angular:expect_angular_material_slider",
        "//tensorboard/webapp/feature_flag",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/views/right_pane/saving_pins_dialog",
        "//tensorboard/webapp/widgets/card_fob:types",
        "//tensorboard/webapp/widgets/dropdown",
        "//tensorboard/webapp/widgets/range_input",
        "//tensorboard/webapp/widgets/range_input:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "right_pane_test",
    testonly = True,
    srcs = [
        "right_pane_test.ts",
    ],
    deps = [
        ":right_pane",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_button_toggle",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_select",
        "//tensorboard/webapp/angular:expect_angular_material_slider",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views/right_pane/saving_pins_dialog",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/widgets/card_fob:types",
        "//tensorboard/webapp/widgets/dropdown",
        "//tensorboard/webapp/widgets/range_input:types",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
