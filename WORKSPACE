workspace(name = "org_tensorflow_tensorboard")

http_archive(
    name = "io_bazel_rules_closure",
    sha256 = "b29a8bc2cb10513c864cb1084d6f38613ef14a143797cea0af0f91cd385f5e8c",
    strip_prefix = "rules_closure-0.8.0",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_closure/archive/0.8.0.tar.gz",
        "https://github.com/bazelbuild/rules_closure/archive/0.8.0.tar.gz",  # 2018-08-03
    ],
)

# Needed as a transitive dependency of rules_webtesting below.
http_archive(
    name = "io_bazel_rules_go",
    sha256 = "8c333df68fb0096221e2127eda2807384e00cc211ee7e7ea4ed08d212e6a69c1",
    strip_prefix = "rules_go-0.5.4",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_go/archive/0.5.4.tar.gz",
        "https://github.com/bazelbuild/rules_go/archive/0.5.4.tar.gz",
    ],
)

# Needed as a transitive dependency of rules_webtesting below.
http_archive(
    name = "bazel_skylib",
    sha256 = "bbccf674aa441c266df9894182d80de104cabd19be98be002f6d478aaa31574d",
    strip_prefix = "bazel-skylib-2169ae1c374aab4a09aa90e65efe1a3aad4e279b",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-skylib/archive/2169ae1c374aab4a09aa90e65efe1a3aad4e279b.tar.gz",
        "https://github.com/bazelbuild/bazel-skylib/archive/2169ae1c374aab4a09aa90e65efe1a3aad4e279b.tar.gz",  # 2018-01-12
    ],
)

http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "a1264301424f2d920fca04f2d3c5ef5ca1be4f2bbf8c84ef38006e54aaf22753",
    strip_prefix = "rules_webtesting-9f597bb7d1b40a63dc443d9ef7e931cfad4fb098",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_webtesting/archive/9f597bb7d1b40a63dc443d9ef7e931cfad4fb098.tar.gz",  # 2017-01-29
        "https://github.com/bazelbuild/rules_webtesting/archive/9f597bb7d1b40a63dc443d9ef7e931cfad4fb098.tar.gz",
    ],
)

http_archive(
    name = "org_tensorflow",
    sha256 = "88324ad9379eae4fdb2aefb8e0d6c7cd0dc748b44daa5cc96ffd9415705c00c3",
    strip_prefix = "tensorflow-9752b117ff63f204c4975cad52b5aab5c1f5e9a9",
    urls = [
        "https://mirror.bazel.build/github.com/tensorflow/tensorflow/archive/9752b117ff63f204c4975cad52b5aab5c1f5e9a9.tar.gz",  # 2018-04-16
        "https://github.com/tensorflow/tensorflow/archive/9752b117ff63f204c4975cad52b5aab5c1f5e9a9.tar.gz",
    ],
)

http_archive(
    name = "ai_google_pair_facets",
    sha256 = "e3f7b7b3c194c1772d16bdc8b348716c0da59a51daa03ef4503cf06c073caafc",
    strip_prefix = "facets-0.2.1",
    urls = [
        "http://mirror.bazel.build/github.com/pair-code/facets/archive/0.2.1.tar.gz",
        "https://github.com/pair-code/facets/archive/0.2.1.tar.gz",
    ],
)

load("@io_bazel_rules_closure//closure:defs.bzl", "closure_repositories")

closure_repositories(
    omit_com_google_protobuf = True,
    omit_com_google_protobuf_js = True,
)

load("@org_tensorflow//tensorflow:workspace.bzl", "tf_workspace")

tf_workspace()

load("@io_bazel_rules_go//go:def.bzl", "go_repositories")

go_repositories()

load("@io_bazel_rules_webtesting//web:repositories.bzl", "browser_repositories", "web_test_repositories")

web_test_repositories(
    omit_com_google_code_findbugs_jsr305 = True,
    omit_com_google_code_gson = True,
    omit_com_google_errorprone_error_prone_annotations = True,
    omit_com_google_guava = True,
    omit_junit = True,
    omit_org_hamcrest_core = True,
)

load("//third_party:workspace.bzl", "tensorboard_workspace")

# Please add all new dependencies in workspace.bzl.
tensorboard_workspace()
