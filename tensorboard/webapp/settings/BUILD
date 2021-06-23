load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ng_web_test_suite")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "settings",
    srcs = [
        "index.ts",
        "settings_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/settings/_redux",
        "//tensorboard/webapp/settings/_views",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        "//tensorboard/webapp/settings/_views:test_lib",
    ],
)
