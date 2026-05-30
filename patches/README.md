# TensorBoard patches using patch-package.

We use [patch-package](https://www.npmjs.com/package/patch-package) to author
TensorBoard-specific patches to some of our npm/yarn dependencies.

At build time, `WORKSPACE` applies the generated patch artifacts via
`yarn_install(post_install_patches = ...)` instead of invoking
`patch-package` inside the repository rule. In the current Bazel/CI setup, that
install-time invocation was less reliable than applying the generated patch
files directly.

After creating or updating a patch, ensure there is no trailing whitespace on
any line (CI runs `./tensorboard/tools/whitespace_hygiene_test.py`). You can
strip it with `sed -i '' 's/[[:space:]]*$//' patches/<patch-file>.patch`.

## `@bazel+concatjs+5.8.1.patch`

**Modified files:**
- `node_modules/@bazel/concatjs/internal/common/compilation.bzl`
- `node_modules/@bazel/concatjs/package.json`

**What it does:**
Updated patch from 5.7.0 to 5.8.1. This version already includes the TypeScript 5.x fix and Chrome sandbox fix that we had to patch manually in 5.7.0.
Added typescript as a direct dependency because the Bazel sandbox can't find it otherwise.

Why 5.8.1 and not 6.x: rules_nodejs 6.x removed most of the build rules we depend on (concatjs, esbuild, typescript, etc.) and moved them to a separate project (rules_js). This effort will be done in future upgrades.


To regenerate:
* `vi node_modules/@bazel/concatjs/internal/common/compilation.bzl`
* `vi node_modules/@bazel/concatjs/package.json`
* make edits
* `yarn patch-package "@bazel/concatjs"`
* update the WORKSPACE file with the name of the new patch file


## `@angular+build-tooling+0.0.0-2113cd7f66a089ac0208ea84eee672b2529f4f6c.patch`

**Modified files:**
- `node_modules/@angular/build-tooling/shared-scripts/angular-optimization/BUILD.bazel`
- `node_modules/@angular/build-tooling/shared-scripts/angular-optimization/esbuild-plugin.mjs`

**What it does:**
Updated for the Angular 17 version of build-tooling, adding the missing Babel dependency and
Disables an optimization plugin that incorrectly removes function calls that Tensorboard depends on runtime.

To regenerate:
* `vi node_modules/@angular/build-tooling/shared-scripts/angular-optimization/BUILD.bazel`
* `vi node_modules/@angular/build-tooling/shared-scripts/angular-optimization/esbuild-plugin.mjs`
* make edits
* `yarn patch-package "@angular/build-tooling"`
* update the WORKSPACE file with the name of the new patch file


## `protobuf_6_31_1_java_export.patch`

**Modified files:**
- `build_defs/java_opts.bzl`
- `bazel/private/proto_library_rule.bzl`

**What it does:**
- Drops the older javadocopts workaround from protobuf's Java export helper on
  the current rules_java/protobuf stack.
- Relaxes the import-prefix normalization check so empty-but-normalized values
  continue to work under the newer path handling used here.


## `rules_cc_protobuf.patch`

**Modified files:**
- `cc/defs.bzl`

**What it does:**
- Re-exports `cc_proto_library` from protobuf's Bazel definitions so callers on
  this repository can keep loading the symbol through `rules_cc` while using the
  protobuf 6.31.1 repository layout.


## `rules_closure_soy_cli.patch`

**Modified files:**
- `closure/templates/closure_java_template_library.bzl`

**What it does:**
- Updates rules_closure's Soy invocation for the compiler/jar combination used
  here.
- Switches to the `--depHeaders` flag expected by this compiler and drops the
  older `--allowExternalCalls` flag that is not accepted here.
