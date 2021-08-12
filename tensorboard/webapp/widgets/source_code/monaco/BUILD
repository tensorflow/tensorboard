load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_web_library(
    name = "requirejs",
    srcs = [
        "@npm//:node_modules/requirejs/require.js",
    ],
    path = "/tf-imports",
    strip_prefix = "node_modules/requirejs",
)

tf_web_library(
    name = "monaco_editor",
    srcs = [
        "@npm//:node_modules/monaco-editor-core/dev/vs/base/browser/ui/codicons/codicon/codicon.ttf",
        "@npm//:node_modules/monaco-editor-core/dev/vs/base/worker/workerMain.js",
        "@npm//:node_modules/monaco-editor-core/dev/vs/editor/editor.main.css",
        "@npm//:node_modules/monaco-editor-core/dev/vs/editor/editor.main.js",
        "@npm//:node_modules/monaco-editor-core/dev/vs/editor/editor.main.nls.js",
    ],
    path = "/tf-imports",
    strip_prefix = "node_modules/monaco-editor-core/dev",
)

tf_web_library(
    name = "monaco_languages",
    srcs = [
        "@npm//:node_modules/monaco-languages/release/dev/monaco.contribution.js",
        "@npm//:node_modules/monaco-languages/release/dev/python/python.js",
    ],
    path = "/tf-imports/vs",
    strip_prefix = "node_modules/monaco-languages/release/dev",
)
