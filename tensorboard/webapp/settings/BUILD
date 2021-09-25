load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "settings",
    srcs = [
        "index.ts",
        "settings_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/settings/_redux",
        "//tensorboard/webapp/settings/_views",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        "//tensorboard/webapp/settings/_redux:_redux_test",
        "//tensorboard/webapp/settings/_views:test_lib",
    ],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = ["testing.ts"],
    deps = [
        "//tensorboard/webapp/settings/_redux",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/util:colors",
    ],
)
