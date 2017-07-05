package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:mocha_test.bzl", "mocha_test")

licenses(["notice"])  # Apache 2.0

# run :test_mocha_devserver to debug locally
mocha_test(
  name = "test",
  srcs = ["sortingTests.ts", "tests.html"],
  test_file = "tests.html",
  path = "/vz-sorting/test",
  deps = [
      "//tensorboard/components/vz_sorting",
  ],
)
