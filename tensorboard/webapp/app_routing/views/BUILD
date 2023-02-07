load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "views",
    srcs = [
        "app_routing_view_module.ts",
        "router_link_directive_container.ts",
        "router_outlet_component.ts",
        "router_outlet_container.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/app_routing:app_root",
        "//tensorboard/webapp/app_routing:internal_utils",
        "//tensorboard/webapp/app_routing:location",
        "//tensorboard/webapp/app_routing:route_registry",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/app_routing/store",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "views_tests",
    testonly = True,
    srcs = [
        "router_link_test.ts",
        "router_outlet_test.ts",
    ],
    deps = [
        ":views",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_dynamic_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing:app_root",
        "//tensorboard/webapp/app_routing:location",
        "//tensorboard/webapp/app_routing:route_registry",
        "//tensorboard/webapp/app_routing:testing",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/app_routing/store",
        "//tensorboard/webapp/testing:utils",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
