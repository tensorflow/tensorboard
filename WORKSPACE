workspace(name = "org_tensorflow_tensorboard")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Needed as a transitive dependency of rules_webtesting below.
http_archive(
    name = "bazel_skylib",
    sha256 = "2b9af2de004d67725c9985540811835389b229c27874f2e15f5e319622a53a3b",
    strip_prefix = "bazel-skylib-e9fc4750d427196754bebb0e2e1e38d68893490a",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-skylib/archive/e9fc4750d427196754bebb0e2e1e38d68893490a.tar.gz",
        "https://github.com/bazelbuild/bazel-skylib/archive/e9fc4750d427196754bebb0e2e1e38d68893490a.tar.gz",
    ],
)

load("@bazel_skylib//lib:versions.bzl", "versions")
versions.check(minimum_bazel_version = "0.16.0")

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
    sha256 = "b7a62250a3a73277ade0ce306d22f122365b513f5402222403e507f2f997d421",
    urls = [
        # tag 0.16.3 resolves to commit 01e5a9f8483167962eddd167f7689408bdeb4e76 (2018-11-28 16:28:45 -0500)
        "https://mirror.bazel.build/github.com/bazelbuild/rules_go/releases/download/0.16.3/rules_go-0.16.3.tar.gz",
        "https://github.com/bazelbuild/rules_go/releases/download/0.16.3/rules_go-0.16.3.tar.gz",
    ],
)

# Needed as a transitive dependency of rules_webtesting below.
http_archive(
    name = "bazel_gazelle",
    sha256 = "6e875ab4b6bf64a38c352887760f21203ab054676d9c1b274963907e0768740d",
    urls = [
        # tag 0.15.0 resolves to commit c728ce9f663e2bff26361ba5978ec5c9e6816a3c (2018-10-13 00:06:11 +0200)
        "https://mirror.bazel.build/github.com/bazelbuild/bazel-gazelle/releases/download/0.15.0/bazel-gazelle-0.15.0.tar.gz",
        "https://github.com/bazelbuild/bazel-gazelle/releases/download/0.15.0/bazel-gazelle-0.15.0.tar.gz",
    ],
)

http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "89f041028627d801ba3b4ea1ef2211994392d46e25c1fc3501b95d51698e4a1e",
    strip_prefix = "rules_webtesting-0.2.2",
    urls = [
        # tag 0.2.2 resolves to commit 596d07c1f38486486969302158b9019418a5409e (2018-12-04 09:20:24 -0800)
        "https://mirror.bazel.build/github.com/bazelbuild/rules_webtesting/archive/0.2.2.tar.gz",
        "https://github.com/bazelbuild/rules_webtesting/archive/0.2.2.tar.gz",
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

# Needed as a transitive dependency of some rules_webtesting targets.
load("@io_bazel_rules_go//go:def.bzl", "go_register_toolchains", "go_rules_dependencies")
go_rules_dependencies()
go_register_toolchains()

# Needed as a transitive dependency of some rules_webtesting targets.
load("@bazel_gazelle//:deps.bzl", "gazelle_dependencies")
gazelle_dependencies()

load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories(
    omit_com_google_code_findbugs_jsr305 = True,
    omit_com_google_errorprone_error_prone_annotations = True,
    omit_com_google_guava = True,
    omit_junit = True,
    omit_org_hamcrest_core = True,
)

load("//third_party:workspace.bzl", "tensorboard_workspace")

# Please add all new dependencies in workspace.bzl.
tensorboard_workspace()
