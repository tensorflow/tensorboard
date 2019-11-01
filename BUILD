load("@npm_bazel_typescript//:index.bzl", "ts_config")

licenses(["notice"])  # Apache 2.0

exports_files(["tsconfig.json"])

ts_config(
    name = "tsconfig-test",
    src = "tsconfig-test.json",
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [":tsconfig.json"],
)

sh_test(
    name = "docs_test",
    size = "small",
    srcs = ["docs_test.sh"],
    data = glob([
        "docs/*.ipynb",
    ]),
)
