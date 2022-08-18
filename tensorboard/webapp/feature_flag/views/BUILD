load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "style",
    src = "feature_flag_page_style.scss",
    deps = ["//tensorboard/webapp:angular_material_sass_deps"],
)

tf_ng_module(
    name = "views",
    srcs = [
        "feature_flag_module.ts",
        "feature_flag_page_component.ts",
        "feature_flag_page_container.ts",
        "types.ts",
    ],
    assets = [
        ":style",
        "feature_flag_page.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/feature_flag/actions",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/feature_flag/store:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
