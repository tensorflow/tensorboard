load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "effects",
    srcs = [
        "app_routing_effects.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/app_routing:app_root",
        "//tensorboard/webapp/app_routing:dirty_updates_registry",
        "//tensorboard/webapp/app_routing:internal_utils",
        "//tensorboard/webapp/app_routing:location",
        "//tensorboard/webapp/app_routing:programmatical_navigation_module",
        "//tensorboard/webapp/app_routing:route_config",
        "//tensorboard/webapp/app_routing:route_registry",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/app_routing/store",
        "//tensorboard/webapp/feature_flag/store",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "effects_tests",
    testonly = True,
    srcs = ["app_routing_effects_test.ts"],
    deps = [
        ":effects",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing:app_root",
        "//tensorboard/webapp/app_routing:dirty_updates_registry",
        "//tensorboard/webapp/app_routing:internal_utils",
        "//tensorboard/webapp/app_routing:location",
        "//tensorboard/webapp/app_routing:programmatical_navigation_module",
        "//tensorboard/webapp/app_routing:route_registry",
        "//tensorboard/webapp/app_routing:testing",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/app_routing/store",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/testing:utils",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
