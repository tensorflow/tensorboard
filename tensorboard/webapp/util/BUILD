load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "lang",
    srcs = [
        "lang.ts",
    ],
)

tf_ts_library(
    name = "string",
    srcs = [
        "string.ts",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
)

tf_ts_library(
    name = "ngrx",
    srcs = [
        "ngrx.ts",
    ],
    deps = ["@npm//@ngrx/store"],
)

tf_ts_library(
    name = "value_formatter",
    srcs = [
        "value_formatter.ts",
    ],
)

tf_ts_library(
    name = "colors",
    srcs = [
        "colors.ts",
    ],
)

tf_ts_library(
    name = "util_tests",
    testonly = True,
    srcs = [
        "colors_test.ts",
        "lang_test.ts",
        "ngrx_test.ts",
        "string_test.ts",
        "value_formatter_test.ts",
    ],
    deps = [
        ":colors",
        ":lang",
        ":ngrx",
        ":string",
        ":value_formatter",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
