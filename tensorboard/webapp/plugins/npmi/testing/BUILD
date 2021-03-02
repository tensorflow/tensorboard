load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = ["index.ts"],
    deps = [
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/util:umap",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)
