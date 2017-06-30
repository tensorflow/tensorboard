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
      "graph-test.ts",
      "hierarchy-test.ts",
      "layout-test.ts",
      "parser-test.ts",
      "util-test.ts",
      "util.ts",
      "index.html"
  ],
  test_file = "index.html",
  path = "/tf-graph-common/test",
  deps = [
      "//tensorboard/plugins/graphs/tf_graph_common",
  ],
)
