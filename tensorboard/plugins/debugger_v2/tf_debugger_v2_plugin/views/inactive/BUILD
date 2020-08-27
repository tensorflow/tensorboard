load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_binary(
    name = "inline_images",
    srcs = ["inline_images.py"],
    python_version = "PY3",
    srcs_version = "PY2AND3",
)

genrule(
    name = "gen_inactive_component.ng.html",
    srcs = ["inactive_component.uninlined.ng.html"] + glob(["images/*.png"]),
    outs = ["inactive_component.ng.html"],
    cmd = "$(execpath //tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/inactive:inline_images) $(SRCS) >'$@'",
    exec_tools = [":inline_images"],
)

ng_module(
    name = "inactive",
    srcs = [
        "inactive_component.ts",
        "inactive_container.ts",
        "inactive_module.ts",
    ],
    assets = [
        "inactive_component.css",
        "inactive_component.ng.html",
    ],
    deps = [
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
