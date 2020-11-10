load("@io_bazel_rules_rust//rust:rust.bzl", "rust_binary", "rust_doc_test", "rust_library", "rust_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

rust_library(
    name = "rustboard_core",
    srcs = [
        "lib.rs",
        "masked_crc.rs",
<<<<<<< HEAD
        "reservoir.rs",
=======
        "scripted_reader.rs",
>>>>>>> 5ecced3ed0b0f615287d32485a23d01973e706e2
    ],
    edition = "2018",
    deps = [
        "//third_party/rust:crc",
        "//third_party/rust:rand",
        "//third_party/rust:rand_chacha",
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
