load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary")

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
