# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Same as web_library but supports TypeScript."""

load(
    "@io_bazel_rules_closure//closure:defs.bzl",
    "closure_js_aspect",
)
load(
    "@io_bazel_rules_closure//closure/private:defs.bzl",
    "CLOSURE_LIBRARY_BASE_ATTR",
    "CLOSURE_WORKER_ATTR",
    "ClosureJsLibraryInfo",
    "WebFilesInfo",
    "collect_js",
    "collect_runfiles",
    "difference",
    "extract_providers",
    "long_path",
    "unfurl",
)
load("//tensorboard/defs/internal:html.bzl", _tb_combine_html = "tb_combine_html")

def _tf_web_library(ctx):
    if not ctx.attr.srcs:
        if ctx.attr.deps:
            fail("deps can not be set when srcs is not")
        if not ctx.attr.exports:
            fail("exports must be set if srcs is not")
    if ctx.attr.path:
        if not ctx.attr.path.startswith("/"):
            fail("webpath must start with /")
        if ctx.attr.path != "/" and ctx.attr.path.endswith("/"):
            fail("webpath must not end with / unless it is /")
        if "//" in ctx.attr.path:
            fail("webpath must not have //")
    elif ctx.attr.srcs:
        fail("path must be set when srcs is set")
    if "*" in ctx.attr.suppress and len(ctx.attr.suppress) != 1:
        fail("when \"*\" is suppressed no other items should be present")

    # process what came before
    deps = extract_providers(ctx.attr.deps, provider = WebFilesInfo)
    deps = unfurl(deps)
    webpaths = depset(transitive = [dep.webpaths for dep in deps])

    # process what comes now
    manifest_srcs = []
    new_webpaths = []
    web_srcs = []
    path = ctx.attr.path
    strip = _get_strip(ctx)
    for src in ctx.files.srcs:
        suffix = _get_path_relative_to_package(src)
        if strip:
            if not suffix.startswith(strip):
                fail("Relative src path not start with '%s': %s" % (strip, suffix))
            suffix = suffix[len(strip):]
        webpath = "%s/%s" % ("" if path == "/" else path, suffix)
        _add_webpath(ctx, src, webpath, webpaths, new_webpaths, manifest_srcs)
        if suffix.endswith(".d.ts"):
            # Polymer v1 fork still specifies d.ts in tf_web_library.
            pass
        elif suffix.endswith(".ts"):
            fail(
                "tf_web_library no longer can build TypeScript. Please use " +
                "tf_ts_library instead.",
            )
        else:
            web_srcs.append(src)

    # perform strict dependency checking
    manifest = _make_manifest(ctx, manifest_srcs)
    webpaths = depset(new_webpaths, transitive = [webpaths])
    dummy, manifests = _run_webfiles_validator(ctx, web_srcs, deps, manifest)
    web_srcs.append(dummy)

    # define development web server that only applies to this transitive closure
    if ctx.attr.srcs:
        devserver_manifests = manifests
        export_deps = []
    else:
        # If a rule exists purely to export other build rules, then it's
        # appropriate for the exported sources to be included in the
        # development web server.
        export_deps = unfurl(extract_providers(ctx.attr.exports, WebFilesInfo))
        devserver_manifests = depset(
            order = "postorder",
            transitive = (
                [manifests] + [dep.manifests for dep in export_deps]
            ),
        )
    params = struct(
        label = str(ctx.label),
        bind = "localhost:6006",
        manifest = [long_path(ctx, man) for man in devserver_manifests.to_list()],
        external_asset = [
            struct(webpath = k, path = v)
            for k, v in ctx.attr.external_assets.items()
        ],
    )
    params_file = _new_file(ctx, "-params.pbtxt")
    ctx.actions.write(output = params_file, content = proto.encode_text(params))
    ctx.actions.write(
        is_executable = True,
        output = ctx.outputs.executable,
        content = "#!/bin/sh\nexec %s %s" % (
            ctx.executable._WebfilesServer.short_path,
            long_path(ctx, params_file),
        ),
    )

    # Export data to parent rules. This uses the legacy, string-based
    # provider mechanism for compatibility with the base `web_library`
    # rule from rules_closure: because `tf_web_library`s may depend on
    # either other `tf_web_library`s or base `web_library`s, the
    # interfaces ~must be the same.
    return [
        WebFilesInfo(
            manifest = manifest,
            manifests = manifests,
            webpaths = webpaths,
            dummy = dummy,
            exports = unfurl(extract_providers(ctx.attr.exports, WebFilesInfo)),
        ),
        collect_js(
            unfurl(extract_providers(ctx.attr.deps, provider = ClosureJsLibraryInfo)),
            ctx.files._closure_library_base,
        ),
        DefaultInfo(
            files = depset(web_srcs + [dummy]),
            runfiles = collect_runfiles(
                ctx,
                files = (ctx.files.srcs +
                         ctx.files.data +
                         ctx.files._closure_library_base + [
                    manifest,
                    params_file,
                    ctx.outputs.executable,
                    dummy,
                ]),
                extra_runfiles_attrs = ["export_deps", "_WebfilesServer"],
            ),
        ),
    ]

def _make_manifest(ctx, src_list):
    manifest = _new_file(ctx, "-webfiles.pbtxt")
    ctx.actions.write(
        output = manifest,
        content = proto.encode_text(struct(
            label = str(ctx.label),
            src = src_list,
        )),
    )
    return manifest

def _run_webfiles_validator(ctx, srcs, deps, manifest):
    dummy = _new_file(ctx, "-webfiles.ignoreme")
    manifests = depset(order = "postorder", transitive = [dep.manifests for dep in deps])
    if srcs:
        args = [
            "WebfilesValidator",
            "--dummy",
            dummy.path,
            "--target",
            manifest.path,
        ]
        if hasattr(ctx, "attr") and hasattr(ctx.attr, "suppress"):
            for category in ctx.attr.suppress:
                args.append("--suppress")
                args.append(category)
        inputs = []  # list of depsets
        inputs.append(depset([manifest] + srcs))
        direct_manifests = depset([dep.manifest for dep in deps])
        for dep in deps:
            inputs.append(depset([dep.dummy]))
            inputs.append(depset([dep.manifest]))
            args.append("--direct_dep")
            args.append(dep.manifest.path)
        for man in difference(manifests, direct_manifests):
            inputs.append(depset([man]))
            args.append("--transitive_dep")
            args.append(man.path)
        argfile = _new_file(ctx, "-webfiles-checker-args.txt")
        ctx.actions.write(output = argfile, content = "\n".join(args))
        inputs.append(depset([argfile]))
        ctx.actions.run(
            inputs = depset(transitive = inputs),
            outputs = [dummy],
            executable = (getattr(ctx.executable, "_ClosureWorker", None) or
                          getattr(ctx.executable, "_ClosureWorkerAspect", None)),
            arguments = ["@@" + argfile.path],
            mnemonic = "Closure",
            execution_requirements = {"supports-workers": "1"},
            progress_message = "Checking webfiles %s" % ctx.label,
        )
    else:
        ctx.actions.write(output = dummy, content = "BOO!")
    manifests = depset([manifest], transitive = [manifests])
    return dummy, manifests

def _new_file(ctx, suffix):
    return ctx.actions.declare_file("%s%s" % (ctx.label.name, suffix))

def _add_webpath(ctx, src, webpath, webpaths, new_webpaths, manifest_srcs):
    if webpath in new_webpaths:
        _fail(ctx, "multiple srcs within %s define the webpath %s " % (
            ctx.label,
            webpath,
        ))
    if webpath in webpaths.to_list():
        _fail(ctx, "webpath %s was defined by %s when already defined by deps" % (
            webpath,
            ctx.label,
        ))
    new_webpaths.append(webpath)
    manifest_srcs.append(struct(
        path = src.path,
        longpath = long_path(ctx, src),
        webpath = webpath,
    ))

def _fail(ctx, message):
    if ctx.attr.suppress == ["*"]:
        print(message)
    else:
        fail(message)

def _get_path_relative_to_package(artifact):
    """Returns file path relative to the package that declared it."""
    path = artifact.path
    for prefix in (
        artifact.root.path,
        artifact.owner.workspace_root if artifact.owner else "",
        artifact.owner.package if artifact.owner else "",
    ):
        if prefix:
            prefix = prefix + "/"
            if not path.startswith(prefix):
                fail("Path %s doesn't start with %s" % (path, prefix))
            path = path[len(prefix):]
    return path

def _get_strip(ctx):
    strip = ctx.attr.strip_prefix
    if strip:
        if strip.startswith("/"):
            _fail(ctx, "strip_prefix should not end with /")
            strip = strip[1:]
        if strip.endswith("/"):
            _fail(ctx, "strip_prefix should not end with /")
        else:
            strip += "/"
    return strip

tf_web_library = rule(
    implementation = _tf_web_library,
    executable = True,
    attrs = {
        "path": attr.string(),
        "srcs": attr.label_list(allow_files = True),
        "deps": attr.label_list(
            aspects = [closure_js_aspect],
        ),
        "exports": attr.label_list(),
        "data": attr.label_list(allow_files = True),
        "suppress": attr.string_list(),
        "strip_prefix": attr.string(),
        "external_assets": attr.string_dict(default = {"/_/runfiles": "."}),
        "_WebfilesServer": attr.label(
            default = Label("@io_bazel_rules_closure//java/io/bazel/rules/closure/webfiles/server:WebfilesServer"),
            executable = True,
            cfg = "exec",
        ),
        "_ClosureWorker": CLOSURE_WORKER_ATTR,
        "_closure_library_base": CLOSURE_LIBRARY_BASE_ATTR,
    },
)

tb_combine_html = _tb_combine_html
