load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "data_table_styles",
    src = "data_table_component.scss",
    deps = ["//tensorboard/webapp:angular_material_sass_deps"],
)

tf_ng_module(
    name = "data_table",
    srcs = [
        "data_table_component.ts",
        "data_table_module.ts",
    ],
    assets = [
        "data_table_component.ng.html",
        ":data_table_styles",
    ],
    deps = [
        "//tensorboard/webapp/metrics/views/card_renderer:scalar_card_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:formatter",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

# tf_ts_library(
#     name = "linked_time_fob_test",
#     testonly = True,
#     srcs = [
#         "linked_time_fob_controller_test.ts",
#         "linked_time_fob_test.ts",
#     ],
#     deps = [
#         ":linked_time_fob",
#         ":types",
#         "//tensorboard/webapp/angular:expect_angular_core_testing",
#         "//tensorboard/webapp/testing:dom",
#         "//tensorboard/webapp/third_party:d3",
#         "@npm//@angular/core",
#         "@npm//@angular/platform-browser",
#         "@npm//@types/jasmine",
#     ],
# )

# tf_ts_library(
#     name = "types",
#     srcs = [
#         "linked_time_types.ts",
#     ],
# )
