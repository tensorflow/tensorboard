load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "app_routing",
    srcs = [
        "app_routing_module.ts",
        "index.ts",
    ],
    deps = [
        ":app_root",
        ":dirty_updates_registry",
        ":internal_utils",
        ":location",
        ":programmatical_navigation_module",
        ":route_registry",
        ":types",
        "//tensorboard/webapp/app_routing/effects",
        "//tensorboard/webapp/app_routing/store",
        "//tensorboard/webapp/app_routing/store:types",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

package_group(
    name = "store_only_utils_allowlisted",
    packages = ["//tensorboard/webapp/app_routing/..."],
)

tf_ng_module(
    name = "store_only_utils",
    srcs = [
        "store_only_utils.ts",
    ],
    visibility = [
        ":store_only_utils_allowlisted",
    ],
    deps = [
        ":internal_utils",
        ":types",
        "//tensorboard/webapp/experiments:types",
    ],
)

tf_ng_module(
    name = "location",
    srcs = [
        "location.ts",
        "location_module.ts",
    ],
    deps = [
        ":internal_utils",
        ":types",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "app_root",
    srcs = [
        "app_root.ts",
        "app_root_module.ts",
    ],
    deps = [
        ":location",
        "@npm//@angular/core",
    ],
)

tf_ng_module(
    name = "dirty_updates_registry",
    srcs = [
        "dirty_updates_registry_module.ts",
        "dirty_updates_registry_types.ts",
    ],
    deps = [
        ":types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "route_registry",
    srcs = [
        "route_registry_module.ts",
        "route_registry_types.ts",
    ],
    deps = [
        ":route_config",
        ":types",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
)

tf_ng_module(
    name = "programmatical_navigation_module",
    srcs = [
        "programmatical_navigation_module.ts",
        "programmatical_navigation_types.ts",
    ],
    deps = [
        ":types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "deep_link_provider",
    srcs = [
        "deep_link_provider.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp:app_state",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "route_config",
    srcs = [
        "route_config.ts",
        "route_config_types.ts",
    ],
    deps = [
        ":deep_link_provider",
        ":types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "route_config_test",
    testonly = True,
    srcs = [
        "route_config_test.ts",
    ],
    deps = [
        ":route_config",
        ":types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)

tf_ts_library(
    name = "namespaced_state_reducer_helper",
    srcs = [
        "namespaced_state_reducer_helper.ts",
    ],
    deps = [
        ":internal_utils",
        ":types",
        "//tensorboard/webapp/app_routing/actions",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "internal_utils",
    srcs = [
        "internal_utils.ts",
    ],
    visibility = [
        "//tensorboard/webapp/app_routing:__subpackages__",
    ],
    deps = [":types"],
)

tf_ng_module(
    name = "testing",
    testonly = True,
    srcs = [
        "testing.ts",
    ],
    deps = [
        ":internal_utils",
        ":location",
        ":types",
        "//tensorboard/webapp/app_routing/actions",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "app_routing_test",
    testonly = True,
    srcs = [
        "app_root_test.ts",
        "dirty_updates_registry_module_test.ts",
        "internal_utils_test.ts",
        "location_test.ts",
        "namespaced_state_reducer_helper_test.ts",
        "programmatical_navigation_module_test.ts",
        "route_registry_module_test.ts",
        "store_only_utils_test.ts",
    ],
    deps = [
        ":app_root",
        ":dirty_updates_registry",
        ":internal_utils",
        ":location",
        ":namespaced_state_reducer_helper",
        ":programmatical_navigation_module",
        ":route_registry",
        ":store_only_utils",
        ":testing",
        ":types",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/util:ngrx",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
