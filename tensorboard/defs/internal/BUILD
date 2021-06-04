package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_binary(
    name = "resource_digest_suffixer",
    srcs = ["resource_digest_suffixer.py"],
)

py_test(
    name = "resource_digest_suffixer_test",
    srcs = ["resource_digest_suffixer_test.py"],
    deps = [
        ":resource_digest_suffixer",
        "//tensorboard:test",
    ],
)

filegroup(
    name = "common_umd_lib",
    srcs = [
        "rxjs_shims.js",
        "@npm//:node_modules/rxjs/dist/bundles/rxjs.umd.js",
        "@npm//:node_modules/tslib/tslib.js",
    ],
)
