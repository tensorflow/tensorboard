# TensorBoard dependency patches

This directory contains TensorBoard-specific patches for Bazel modules and
npm/Yarn dependencies. Bazel module patches are applied from `MODULE.bazel`;
npm patches are authored with
[patch-package](https://www.npmjs.com/package/patch-package).

At build time, the `tensorboard_node_dependencies` module extension in
`third_party/nodejs_extensions.bzl` applies the generated patch artifacts via
`yarn_install(post_install_patches = ...)` instead of invoking `patch-package`
inside the repository rule. In the current Bazel/CI setup, that install-time
invocation was less reliable than applying the generated patch files directly.

Unified diffs require a single space on otherwise blank context lines. The
repository whitespace check explicitly permits those lines in applicable patch
files; do not strip them because doing so makes the patch invalid. Other patch
content must not have trailing whitespace (CI runs
`./tensorboard/tools/whitespace_hygiene_test.py`).

**Important:** `patch-package` defaults to `--exclude '/package\.json$/'`, so a
plain `yarn patch-package "<pkg>"` silently drops any changes to the package's
`package.json`. Pass `--exclude '^$'` whenever the patch needs to modify that
file, and always review `git diff patches/` after regenerating to confirm no
hunk disappeared.

## `@bazel+concatjs+5.8.1.patch`

**Modified files:**
* `node_modules/@bazel/concatjs/internal/common/compilation.bzl`
* `node_modules/@bazel/concatjs/internal/common/tsconfig.bzl`
* `node_modules/@bazel/concatjs/package.json`

**What it does:**
Three independent changes:

1. `compilation.bzl` stops declaring `*.ngfactory.*` and `*.ngsummary.*` outputs
   when `use_angular_plugin = True`. Ivy no longer emits those files, so Bazel
   failed with "declared output was not created".
2. `tsconfig.bzl` adds `module_roots` entries mapping each Angular, Material,
   CDK and NgRx entry point to its `types/<name>.d.ts` file. Starting with
   Angular 21, APF packaging exposes type definitions only through
   `package.json` `"exports"`, which the Bazel `node_modules` path mapping
   cannot resolve.
3. `package.json` adds `typescript` as a direct dependency because the Bazel
   sandbox cannot find it otherwise.

Note that putting the mappings from (2) in the workspace `tsconfig.json` does not
work: the tsconfig Bazel generates does `extends` the workspace one, but it also
writes its own `compilerOptions.paths`, and TypeScript replaces `paths` wholesale
instead of merging it.

Why 5.8.1 and not 6.x: rules_nodejs 6.x removed most of the build rules we depend on (concatjs, esbuild, typescript, etc.) and moved them to a separate project (rules_js). This effort will be done in future upgrades.

Removal is planned. `@bazel/concatjs` 5.8.1 is the last published version and
rules_nodejs is archived, so no upstream fix is coming. The near-term plan is to
move the `tsconfig.bzl` mappings and the `compilation.bzl` outputs override into
a TensorBoard-owned `ts_library` rule under `tensorboard/defs`, which reuses
concatjs `compile_ts` without patching it. See the `TODO` in the `tsconfig.bzl`
hunk.

To regenerate:
* `vi node_modules/@bazel/concatjs/internal/common/compilation.bzl`
* `vi node_modules/@bazel/concatjs/internal/common/tsconfig.bzl`
* `vi node_modules/@bazel/concatjs/package.json`
* make edits
* `yarn patch-package "@bazel/concatjs" --exclude '^$'` (the `--exclude` is
  required, otherwise the `package.json` hunk is dropped)
* update `third_party/nodejs_extensions.bzl` with the new patch file name


## `@angular+build-tooling+0.0.0-98b30ab5fdeeb1df3278f5257b9a8f07abb76941.patch`

**Modified files:**
* `node_modules/@angular/build-tooling/shared-scripts/angular-optimization/esbuild-plugin.mjs`

**What it does:**
Disables the `markTopLevelPure` optimization plugin, which culls top-level
function calls that TensorBoard depends on at runtime. Without this, the app
bundles to a blank page with no console error. The resulting bundle is larger.

Note the patch file name tracks the pinned `@angular/build-tooling` commit, so it
has to be renamed (and the module-extension reference updated) whenever that
dependency is bumped.

Removal is planned along with the concatjs patch. `@angular/build-tooling` is
frozen upstream, and both patches only go away once the frontend build moves off
rules_nodejs.

To regenerate:
* `vi node_modules/@angular/build-tooling/shared-scripts/angular-optimization/esbuild-plugin.mjs`
* make edits
* `yarn patch-package "@angular/build-tooling"`
* update `third_party/nodejs_extensions.bzl` with the new patch file name


## `gzgz_rules_sass_bzlmod_npm_paths.patch`

**Modified files:**
- `MODULE.bazel`
- `sass/defs.bzl`

**What it does:**
- Corrects the module version embedded in the 1.0.4 release archive.
- Adds the canonical Bzlmod `node_modules` roots represented by Sass dependency
  inputs to Dart Sass's load paths. This lets Sass packages supplied by
  TensorBoard's module-extension `yarn_install` repository resolve inside Bazel
  sandboxes.

Removal is planned when an upstream release carries the correct module version
and resolves npm package imports from Bzlmod extension repositories, or when
TensorBoard's remaining legacy Yarn/Sass consumers migrate to the modern
`rules_js` package graph.


## `protobuf_33_6_bzlmod.patch`

**Modified files:**
- `MODULE.bazel`

**What it does:**
- Exposes protobuf's system-Python and pip repositories to downstream modules;
  upstream marks both development-only even though public Python build targets
  load them.
- Gives protobuf's pinned Maven install its own generated repository while
  preserving protobuf's internal `@maven` apparent name. Starting in protobuf
  32, the install uses the shared default name and its lockfile excludes Java
  dependencies contributed by rules_closure and grpc-java.

Removal is planned once protobuf exposes its Python repositories and isolates
its pinned Maven lockfile upstream.


## `rules_closure_java_proto_library.patch`

**Modified files:**
- `java/io/bazel/rules/closure/BUILD`
- `java/io/bazel/rules/closure/webfiles/BUILD`
- `java/io/bazel/rules/closure/webfiles/server/BUILD`

**What it does:**
- Loads `java_proto_library` from protobuf's supported Bazel API instead of
  the deprecated compatibility export in `rules_java`.
- Removes the associated Bazel 8 deprecation warnings from TensorBoard's
  Closure and Vulcanize targets.

Removal is planned once rules_closure publishes this migration upstream.


## `rules_nodejs_5_8_1_bzlmod.patch`

**Modified areas:**
- npm repository generation and repository-label handling
- Node launcher and source-map runfiles lookup
- esbuild toolchain registration
- legacy host-Windows selectors

**What it does:**
- Makes rules_nodejs 5.8.1's repository rules and launchers understand
  canonical Bzlmod repository names.
- Lets TensorBoard register the generated esbuild toolchains from
  `MODULE.bazel`.
- Replaces deprecated Bazel host-Windows selectors with platform constraints,
  eliminating warnings from generated npm targets on Bazel 8.

Removal is planned as one coordinated migration from Yarn, concatjs,
`ts_library`, and the pinned Angular bundling/test helpers to rules_js,
rules_ts, and maintained bundling/test rules.


## `rules_web_testing_python_py310.patch`

**Modified files:**
- `MODULE.bazel`

**What it does:**
- Changes the rules_web_testing_python 0.4.1 toolchain and pip-wheel tags from
  Python 3.11 to TensorBoard's hermetic Python 3.10 baseline.
- Prevents its Selenium target from selecting a Python-3.11-only wheel while
  TensorBoard analyzes functional tests with Python 3.10.

Removal is planned when rules_web_testing_python lets the root module select
the Python version instead of hardcoding it in the dependency module.


## `rules_web_testing_java_guava.patch`

**Modified files:**
- `MODULE.bazel`

**What it does:**
- Aligns rules_web_testing_java's direct Guava declaration with the
  `33.5.0-android` artifact already required by grpc-java 1.82.0 in their
  shared rules_jvm_external module extension.
- Removes the duplicate-version warning without changing the artifact selected
  by the working Bazel 8 graph.

Removal is planned when rules_web_testing_java updates its Guava declaration or
the web-testing and grpc-java dependencies no longer share conflicting Maven
coordinates.
