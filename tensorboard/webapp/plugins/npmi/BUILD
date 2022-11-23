load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "npmi_component_styles",
    src = "npmi_component.scss",
)

tf_ng_module(
    name = "npmi",
    srcs = [
        "npmi_component.ts",
        "npmi_container.ts",
        "npmi_module.ts",
    ],
    assets = [
        ":npmi_component_styles",
        "npmi_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins:plugin_registry",
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/data_source",
        "//tensorboard/webapp/plugins/npmi/effects",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/views/embeddings",
        "//tensorboard/webapp/plugins/npmi/views/inactive",
        "//tensorboard/webapp/plugins/npmi/views/main",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "npmi_test_lib",
    testonly = True,
    srcs = [
        "npmi_container_test.ts",
    ],
    deps = [
        ":npmi",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/testing",
        "//tensorboard/webapp/plugins/npmi/views/embeddings",
        "//tensorboard/webapp/plugins/npmi/views/inactive",
        "//tensorboard/webapp/plugins/npmi/views/main",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
