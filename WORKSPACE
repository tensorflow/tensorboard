workspace(name = "org_tensorflow_tensorboard")

http_archive(
    name = "io_bazel_rules_closure",
    sha256 = "e9e2538b1f7f27de73fa2914b7d2cb1ce2ac01d1abe8390cfe51fb2558ef8b27",
    strip_prefix = "rules_closure-4c559574447f90751f05155faba4f3344668f666",
    urls = [
        "http://mirror.bazel.build/github.com/bazelbuild/rules_closure/archive/4c559574447f90751f05155faba4f3344668f666.tar.gz",
        "https://github.com/bazelbuild/rules_closure/archive/4c559574447f90751f05155faba4f3344668f666.tar.gz",  # 2017-06-21
    ],
)

load("@io_bazel_rules_closure//closure:defs.bzl", "closure_repositories")

closure_repositories()

load("//third_party:workspace.bzl", "tensorboard_workspace")

# Please add all new dependencies in workspace.bzl.
tensorboard_workspace()
