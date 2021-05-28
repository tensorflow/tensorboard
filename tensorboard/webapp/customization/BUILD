load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "customization",
    srcs = [
        "customizable_component.ts",
        "customization_module.ts",
    ],
    deps = [     
        "@npm//@angular/common",   
        "@npm//@angular/core",
    ],
)

tf_ng_module(
    name = "customization_test_lib",
    testonly = True,
    srcs = ["customization_test.ts"],
    deps = [
        ":customization",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
    ],
)
