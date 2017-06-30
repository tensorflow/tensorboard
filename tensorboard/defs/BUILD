package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

filegroup(
    name = "ts_web_library_default_typings",
    srcs = [
        # Ordering probably matters.
        "@com_microsoft_typescript//:lib.es6.d.ts",
        "@io_angular_clutz//:src/resources/closure.lib.d.ts",
        "clutz.d.ts",
    ],
    visibility = ["//visibility:public"],
)

py_binary(
    name = "mocha_driver",
    srcs = ["mocha_driver.py"],
    srcs_version = "PY2AND3",
    deps = ["@io_bazel_rules_webtesting//testing/web"],
    testonly = True,
)
