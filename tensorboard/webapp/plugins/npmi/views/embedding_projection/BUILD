load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "embedding_projection_component_styles",
    src = "embedding_projection_component.scss",
    strict_deps = False,
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "embedding_projection",
    srcs = [
        "embedding_projection_component.ts",
        "embedding_projection_container.ts",
        "embedding_projection_module.ts",
    ],
    assets = [
        ":embedding_projection_component_styles",
        "embedding_projection_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "embedding_projection_test_lib",
    testonly = True,
    srcs = [
        "embedding_projection_test.ts",
    ],
    deps = [
        ":embedding_projection",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/testing",
        "//tensorboard/webapp/testing:mat_icon",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
