load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "data_table_styles",
    src = "data_table_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "header_cell_styles",
    src = "header_cell_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "content_cell_styles",
    src = "content_cell_component.scss",
)

tf_sass_binary(
    name = "data_table_header_styles",
    src = "data_table_header_component.scss",
)

tf_sass_binary(
    name = "column_selector_component_styles",
    src = "column_selector_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "context_menu_component_styles",
    src = "context_menu_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "filter_dialog_styles",
    src = "filter_dialog_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_ng_module(
    name = "data_table",
    srcs = [
        "content_cell_component.ts",
        "content_row_component.ts",
        "data_table_component.ts",
        "data_table_module.ts",
        "header_cell_component.ts",
    ],
    assets = [
        "content_cell_component.ng.html",
        "data_table_component.ng.html",
        "header_cell_component.ng.html",
        ":content_cell_styles",
        ":data_table_styles",
        ":header_cell_styles",
    ],
    deps = [
        ":column_selector",
        ":context_menu",
        ":data_table_header",
        ":filter_dialog",
        ":types",
        ":utils",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/metrics/views/card_renderer:scalar_card_types",
        "//tensorboard/webapp/widgets/custom_modal",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:formatter",
        "//tensorboard/webapp/widgets/range_input:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "data_table_header",
    srcs = [
        "data_table_header_component.ts",
        "data_table_header_module.ts",
    ],
    assets = [
        "data_table_header_component.ng.html",
        ":data_table_header_styles",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_tooltip",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ng_module(
    name = "column_selector",
    srcs = [
        "column_selector_component.ts",
        "column_selector_module.ts",
    ],
    assets = [
        "column_selector_component.ng.html",
        ":column_selector_component_styles",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/angular:expect_angular_material_tooltip",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "context_menu",
    srcs = [
        "context_menu_component.ts",
        "context_menu_module.ts",
    ],
    assets = [
        "context_menu_component.ng.html",
        ":context_menu_component_styles",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "filter_dialog",
    srcs = [
        "filter_dialog_component.ts",
        "filter_dialog_module.ts",
    ],
    assets = [
        "filter_dialog_component.ng.html",
        ":filter_dialog_styles",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/widgets/filter_input",
        "//tensorboard/webapp/widgets/range_input",
        "//tensorboard/webapp/widgets/range_input:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
)

tf_ts_library(
    name = "utils",
    srcs = [
        "utils.ts",
    ],
    deps = [
        ":types",
    ],
)

tf_ts_library(
    name = "utils_test",
    testonly = True,
    srcs = [
        "utils_test.ts",
    ],
    deps = [
        ":types",
        ":utils",
        "@npm//@types/jasmine",
    ],
)

tf_ts_library(
    name = "data_table_test",
    testonly = True,
    srcs = [
        "column_selector_test.ts",
        "content_cell_component_test.ts",
        "context_menu_test.ts",
        "data_table_test.ts",
        "filter_dialog_test.ts",
        "header_cell_component_test.ts",
    ],
    deps = [
        ":column_selector",
        ":context_menu",
        ":data_table",
        ":filter_dialog",
        ":types",
        "//tensorboard/webapp/angular:expect_angular_cdk_testing",
        "//tensorboard/webapp/angular:expect_angular_cdk_testing_testbed",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/widgets/custom_modal",
        "//tensorboard/webapp/widgets/range_input",
        "//tensorboard/webapp/widgets/range_input:types",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
