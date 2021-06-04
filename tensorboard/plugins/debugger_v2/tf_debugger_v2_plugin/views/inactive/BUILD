load("//tensorboard/defs:defs.bzl", "tf_inline_pngs", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_inline_pngs(
    name = "gen_inactive_component.ng.html",
    out = "inactive_component.ng.html",
    html_template = "inactive_component.uninlined.ng.html",
    images = glob(["images/*.png"]),
)

tf_ng_module(
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
