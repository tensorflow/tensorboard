load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "histogram_styles",
    src = "histogram_component.scss",
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "histogram",
    srcs = [
        "histogram_card_fob_controller.ts",
        "histogram_component.ts",
        "histogram_module.ts",
    ],
    assets = [
        "histogram_component.ng.html",
        ":histogram_styles",
    ],
    deps = [
        ":formatter",
        ":types",
        "//tensorboard/webapp/third_party:d3",
        "//tensorboard/webapp/widgets:resize_detector",
        "//tensorboard/webapp/widgets/card_fob",
        "//tensorboard/webapp/widgets/card_fob:types",
        "//tensorboard/webapp/widgets/intersection_observer",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "histogram_test",
    testonly = True,
    srcs = [
        "formatter_test.ts",
        "histogram_card_fob_test.ts",
        "histogram_test.ts",
        "histogram_util_test.ts",
    ],
    deps = [
        ":formatter",
        ":histogram",
        ":types",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/third_party:d3",
        "//tensorboard/webapp/widgets/card_fob",
        "//tensorboard/webapp/widgets/card_fob:types",
        "//tensorboard/webapp/widgets/intersection_observer:intersection_observer_testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "histogram_types.ts",
        "histogram_util.ts",
    ],
    deps = [
        "//tensorboard/webapp:tb_polymer_interop_types",
    ],
)

tf_ts_library(
    name = "formatter",
    srcs = [
        "formatter.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        "//tensorboard/webapp/third_party:d3",
    ],
)
