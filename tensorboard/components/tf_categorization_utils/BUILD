load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_categorization_utils",
    srcs = [
        "categorizationUtils.ts",
        "tf-tag-filterer.ts",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/tf_utils",
        "//tensorboard/components/vz_sorting",
        "@npm//@polymer/decorators",
        "@npm//@polymer/iron-icon",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)
