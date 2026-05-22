# Open-source-only file (synced as BUILD.OPENSOURCE). Internally this dependency
# is managed directly by Blaze, so npm_sass_library is not needed.
load("@io_bazel_rules_sass//:defs.bzl", "npm_sass_library")

package(default_visibility = ["//tensorboard:internal"])

npm_sass_library(
    name = "material_sass",
    deps = ["@npm//@angular/material"],
)
