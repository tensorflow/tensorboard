load("@io_bazel_rules_rust//rust:rust.bzl", "rust_binary", "rust_doc_test", "rust_library", "rust_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

rust_library(
    name = "rustboard_core",
    srcs = [
        "lib.rs",
        "masked_crc.rs",
    ],
    edition = "2018",
    deps = [
        "//third_party/rust:crc",
    ],
)

rust_test(
    name = "rustboard_core_test",
    crate = ":rustboard_core",
)

rust_doc_test(
    name = "rustboard_core_doc_test",
    dep = ":rustboard_core",
)

rust_binary(
    name = "server",
    srcs = ["main.rs"],
    edition = "2018",
)
