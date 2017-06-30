package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:mocha_test.bzl", "mocha_test")

licenses(["notice"])  # Apache 2.0

# TODO(@dandelionmane): Fix this test, which does not build.
# # run :test_mocha_devserver to debug locally
# mocha_test(
#     name = "test",
#     srcs = [
#         "autoReloadTests.ts",
#         "e2eTests.ts",
#         "e2eTests.html",
#         "fastTabSwitch.ts",
#         "fastTabSwitch.html",
#         "tensorboardTests.ts",
#         "tensorboardTests.html",
#         "index.html"
#     ],
#     test_file = "index.html",
#     path = "/tf-tensorboard/test",
#     deps = ["//tensorboard/components/tf_tensorboard"],
#     tags = ["manual"],
# )
