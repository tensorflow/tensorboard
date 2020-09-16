load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

ng_module(
    name = "line_chart",
    srcs = [
        "line_chart_component.ts",
        "line_chart_module.ts",
        "line_chart_types.ts",
        "polymer_interop_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/types:ui",
        "@npm//@angular/core",
    ],
)

ng_module(
    name = "line_chart_test",
    testonly = True,
    srcs = ["line_chart_test.ts"],
    deps = [
        ":line_chart",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
