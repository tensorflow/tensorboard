package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:mocha_test.bzl", "mocha_test")

licenses(["notice"])  # Apache 2.0

# run :test_mocha_devserver to debug locally
mocha_test(
    name = "test",
    srcs = [
        "tests.html",
        "backendTests.ts",
        "requestManagerTests.ts",
    ] + glob(["data/**"]),
    test_file = "tests.html",
    path = "/tf-backend/test",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:polymer",
    ],
    # TODO(@dandelionmane): Fix this failing test.
    tags = ["manual"],
)

