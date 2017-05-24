workspace(name = "org_tensorflow_tensorboard")

http_archive(
    name = "io_bazel_rules_closure",
    sha256 = "4be8a887f6f38f883236e77bb25c2da10d506f2bf1a8e5d785c0f35574c74ca4",
    strip_prefix = "rules_closure-aac19edc557aec9b603cd7ffe359401264ceff0d",
    urls = [
        "http://mirror.bazel.build/github.com/bazelbuild/rules_closure/archive/aac19edc557aec9b603cd7ffe359401264ceff0d.tar.gz",  # 2017-05-10
        "https://github.com/bazelbuild/rules_closure/archive/aac19edc557aec9b603cd7ffe359401264ceff0d.tar.gz",
    ],
)


load("@io_bazel_rules_closure//closure:defs.bzl", "closure_repositories")

closure_repositories()

load("//tensorboard:workspace.bzl", "tensorboard_workspace")

# Please add all new dependencies in workspace.bzl.
tensorboard_workspace()
