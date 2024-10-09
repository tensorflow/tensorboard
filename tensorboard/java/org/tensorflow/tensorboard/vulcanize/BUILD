load("@rules_java//java:defs.bzl", "java_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

java_binary(
    name = "Vulcanize",
    srcs = ["Vulcanize.java"],
    jvm_flags = [
        "-Xss20m",  # JSCompiler needs big stacks for recursive parsing
        "-XX:+UseParallelGC",  # Best GC when app isn't latency sensitive
    ],
    visibility = ["//visibility:public"],
    deps = [
        "@com_google_guava",
        "@com_google_protobuf//:protobuf_java",
        "@io_bazel_rules_closure//java/io/bazel/rules/closure:webpath",
        "@io_bazel_rules_closure//java/io/bazel/rules/closure/webfiles:build_info_java_proto",
        "@org_jsoup",
    ],
)

java_binary(
    name = "Zipper",
    srcs = ["Zipper.java"],
    deps = [
        "@com_google_guava",
        "@com_google_protobuf//:protobuf_java",
        "@io_bazel_rules_closure//java/io/bazel/rules/closure/webfiles",
        "@io_bazel_rules_closure//java/io/bazel/rules/closure/webfiles:build_info_java_proto",
    ],
)
