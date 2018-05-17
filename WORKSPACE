workspace(name = "org_tensorflow_tensorboard")

http_archive(
    name = "io_bazel_rules_closure",
    sha256 = "cc0ba00493a59fe129a03240330578d2d99aa9fa8007d7f73ea337b5184cae94",
    strip_prefix = "rules_closure-dea93c4667e95802a8511c873fb8504eb1cf5125",
    urls = [
        "https://mirror.bazel.build/github.com/bazelbuild/rules_closure/archive/dea93c4667e95802a8511c873fb8504eb1cf5125.tar.gz",
        "https://github.com/bazelbuild/rules_closure/archive/dea93c4667e95802a8511c873fb8504eb1cf5125.tar.gz",  # 2018-05-09
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
    sha256 = "8028d51b4a911adeb9b8afa0ba6bcb99fa00a4949881cdad3ee67a8f33c8979a",
    strip_prefix = "tensorflow-3128b43eb0bf37ac3c49cb22a6e1789d8ea346e8",
    urls = [
        "https://mirror.bazel.build/github.com/tensorflow/tensorflow/archive/3128b43eb0bf37ac3c49cb22a6e1789d8ea346e8.tar.gz",  # 2018-04-16
        "https://github.com/tensorflow/tensorflow/archive/3128b43eb0bf37ac3c49cb22a6e1789d8ea346e8.tar.gz",
    ],
)

http_archive(
    name = "tf_serving",
    sha256 = "c232e3ac72e42acd85b734c89fb0eed1fe8bfc9641b3953b2294c25fdf9976df",
    strip_prefix = "serving-c99e6082db5bb8ac20d7653a36fdca7396a3ea73",
    urls = [
        "http://mirror.bazel.build/github.com/tensorflow/serving/archive/c99e6082db5bb8ac20d7653a36fdca7396a3ea73.tar.gz",
        "https://github.com/tensorflow/serving/archive/c99e6082db5bb8ac20d7653a36fdca7396a3ea73.tar.gz",
    ],
)

http_archive(
    name = "ai_google_pair_facets",
    sha256 = "b31e717c9b07cf39eeaddb79008cb248bc22697486a841b48a240bfa06899ac3",
    strip_prefix = "facets-2da12d48b624b084da74eedc5325a5016ab0625c",
    urls = [
        "http://mirror.bazel.build/github.com/pair-code/facets/archive/2da12d48b624b084da74eedc5325a5016ab0625c.tar.gz",
        "https://github.com/pair-code/facets/archive/2da12d48b624b084da74eedc5325a5016ab0625c.tar.gz",
    ],
)

load("@io_bazel_rules_closure//closure:defs.bzl", "closure_repositories")

closure_repositories()

load("@tf_serving//tensorflow_serving:workspace.bzl", "tf_serving_workspace")

tf_serving_workspace()

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
