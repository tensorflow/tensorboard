load("@npm_bazel_typescript//:index.bzl", "ts_config")

licenses(["notice"])  # Apache 2.0

exports_files(["tsconfig.json"])


ts_config(
    name = "tsconfig-test",
    src = "tsconfig-test.json",
    deps = [":tsconfig.json"],
    visibility = [
	"//tensorboard:internal",
    ],
)
