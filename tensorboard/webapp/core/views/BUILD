load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "layout_styles",
    src = "layout_container.scss",
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "layout",
    srcs = [
        "layout_container.ts",
        "layout_module.ts",
    ],
    assets = [":layout_styles"],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/core:state",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/util:dom",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "hash_storage",
    srcs = [
        "hash_storage_component.ts",
        "hash_storage_container.ts",
        "hash_storage_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/core:state",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/deeplink",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "page_title",
    srcs = [
        "page_title_component.ts",
        "page_title_container.ts",
        "page_title_module.ts",
    ],
    deps = [
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/core:state",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/store",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "dark_mode_supporter",
    srcs = [
        "dark_mode_supporter_container.ts",
        "dark_mode_supporter_module.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "dark_mode_supporter_test.ts",
        "hash_storage_test.ts",
        "layout_test.ts",
        "page_title_test.ts",
    ],
    deps = [
        ":dark_mode_supporter",
        ":hash_storage",
        ":layout",
        ":page_title",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/core:state",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/deeplink",
        "//tensorboard/webapp/experiments/store:testing",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/util:dom",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
