# How to write your own plugin

You can extend TensorBoard to show custom visualizations and connect to custom
backends by writing a custom plugin. Clone and tinker with one of the
[examples][plugin-examples], or learn about the plugin system by following the
[ADDING_A_PLUGIN](./ADDING_A_PLUGIN.md) guide. Custom plugins can be
[published][plugin-distribution] on PyPI to be shared with the community.

Developing a custom plugin does not require Bazel or building TensorBoard.

[plugin-examples]: ./tensorboard/examples/plugins
[plugin-distribution]: ./ADDING_A_PLUGIN.md#distribution

# How to Develop TensorBoard

TensorBoard at HEAD relies on the nightly installation of TensorFlow: this allows plugin authors to use the latest features of TensorFlow, but it means release versions of TensorFlow may not suffice for development. We recommend installing TensorFlow nightly in a [Python virtualenv](https://virtualenv.pypa.io), and then running your modified development copy of TensorBoard within that virtualenv. To install TensorFlow nightly within the virtualenv, as well as TensorBoard's runtime and tooling dependencies, you can run:

```sh
$ virtualenv -p python3 tf
$ source tf/bin/activate
(tf)$ pip install --upgrade pip
(tf)$ pip install tf-nightly -r tensorboard/pip_package/requirements.txt -r tensorboard/pip_package/requirements_dev.txt
(tf)$ pip uninstall -y tb-nightly
```

TensorBoard builds are done with [Bazel](https://bazel.build). The supported
version is pinned in `.bazelversion` (currently Bazel 8.7.0) so local and CI
builds use the same incompatible-flag behavior and the same validated Bzlmod
dependency graph. Bazelisk reads this file and selects that version
automatically. TensorBoard uses Bzlmod exclusively for dependency resolution;
legacy builds with `--noenable_bzlmod` are not supported and WORKSPACE
evaluation is explicitly disabled in `.bazelrc`. New dependencies should use a
BCR module, a module extension, or `use_repo_rule` in that order.

The frontend still consumes the legacy rules_nodejs 5.8.1 concatjs APIs, but
its Node, Yarn, npm, and esbuild repositories are instantiated by a module
extension. This keeps the build WORKSPACE-independent while the TypeScript
targets are incrementally migrated to rules_js/rules_ts.

The supported strict build can be exercised directly with:

```sh
(tf)$ bazel test //tensorboard/... --noenable_workspace
```

The Bazel build and test configuration is currently validated on Linux only.
Bazel downloads a checksummed Python 3.10 runtime for its actions, so the
interpreter used by Bazel does not depend on the host `python3`. Continue to use
the activated virtual environment for package-management commands and for the
pip-package tests described below.

Python packages imported by Bazel targets are resolved from
`tensorboard/pip_package/requirements_bazel_lock.txt`. After changing either
pip requirements file or the TensorFlow compatibility baseline, regenerate the
lock on Linux with Python 3.10 and review the resulting version changes. Bazel
tests use the stable TensorFlow version in `requirements_bazel.in`; the
pip-package smoke test separately exercises the CI-selected version, currently
`tf-nightly`.

```sh
(tf)$ python -m pip install "uv==0.5.31"
(tf)$ uv pip compile --python-version 3.10 --generate-hashes \
    --output-file tensorboard/pip_package/requirements_bazel_lock.txt \
    tensorboard/pip_package/requirements_bazel.in
```

The Flogger artifacts used by TensorBoard's customized Soy repository are
resolved through the `rules_jvm_external` module extension and pinned in
`maven_install.json`. After changing their coordinates in `MODULE.bazel`,
regenerate that lockfile with:

```sh
(tf)$ REPIN=1 bazel run @tensorboard_maven//:pin
```

The Bazel build will automatically "vulcanize" all the HTML files and generate
a "binary" launcher script. When HTML is vulcanized, it means all the script
tags and HTML imports are inlined into one big HTML file. Then the Bazel build
puts that index.html file inside a static assets zip. The Python HTTP server
then reads static assets from that zip while serving.

You can build and run TensorBoard via Bazel (from within the TensorFlow nightly virtualenv) as follows:

```sh
(tf)$ bazel run //tensorboard -- --logdir /path/to/logs
```

For any changes to the frontend, you’ll need to install [Yarn][yarn] to lint your code (`yarn lint`, `yarn fix-lint`). You’ll also need Yarn to add or remove any NPM dependencies.

For any changes to the backend, you’ll need to install [Black][black] to lint your code (run `black .`). Our `black` version is specified in `requirements_dev.txt` in this repository. Black only runs on Python 3.6 or higher, so you may want to install it into a separate virtual environment and use a [wrapper script to invoke it from any environment][black-wrapper].

You may wish to configure your editor to automatically run Prettier and Black on save.

To generate fake log data for a plugin, run its demo script. For instance, this command generates fake scalar data in `/tmp/scalars_demo`:

```sh
(tf)$ bazel run //tensorboard/plugins/scalar:scalars_demo
```

If you have Bazel≥0.16 and want to build any commit of TensorBoard prior to 2018-08-07, then you must first cherry-pick [pull request #1334][pr-1334] onto your working tree:

```
$ git cherry-pick bc4e7a6e5517daf918433a8f5983fc6bd239358f
```

[black]: https://github.com/psf/black
[black-wrapper]: https://gist.github.com/wchargin/d65820919f363d33545159138c86ce31
[pr-1334]: https://github.com/tensorflow/tensorboard/pull/1334
[yarn]: https://yarnpkg.com/

## Pro tips

You may find the following optional tips useful for development.

### Ignoring large cleanup commits in `git blame`

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs  # requires Git >= 2.23
```

We maintain a list of commits with large diffs that are known to not have any
semantic effect, like mass code reformattings. As of Git 2.23, you can configure
Git to ignore these commits in the output of `git blame`, so that lines are
blamed to the most recent “real” change. Set the `blame.ignoreRevsFile` Git
config option to `.git-blame-ignore-revs` to enable this by default, or pass
`--ignore-revs-file .git-blame-ignore-revs` to enable it for a single command.
When enabled by default, this also works with editor plugins like
[vim-fugitive]. See `git help blame` and `git help config` for more details.

[vim-fugitive]: https://github.com/tpope/vim-fugitive

### iBazel and dev target

To make the devleopment faster, we can use run TensorBoard on dev target with iBazel.

```sh
(tf)$ ibazel run tensorboard:dev -- \
--logdir path/to/logs \
[--bind_all] \
[--port PORT_NUMBER]
```

- `ibazel`: Bazel is capable of performing incremental builds where it builds only
  the subset of files that are impacted by file changes. However, it does not come
  with a file watcher. For an improved developer experience, start TensorBoard
  with `ibazel` instead of `bazel` which will automatically re-build and start the
  server when files change.
- `:dev`: A target to bundle all dev assets with no vulcanization, which makes
  the build faster.
- `--bind_all`: Used to view the running TensorBoard over the network than
  from `localhost`, necessary when running at a remote machine and accessing
  the server from your local chrome browser.

Access your server at `http://<YOUR_SERVER_ADDRESS>:<PORT_NUMBER>/` if you are
running TensorBoard at a remote machine. Otherwise `localhost:<PORT_NUMBER>` should
work.

If you do not have the ibazel binary on your system, you can use the command
below.

```sh
# Optionally run `yarn` to keep `node_modules` up-to-date.
yarn run ibazel run tensorboard:dev -- -- --logdir path/to/logs
```

### Development Using Docker

Rather than spend the time setting up a development environment, you may find it
easier to run the project using Docker.

Build the image using the following command from the root directory.
`docker build -t tensorflow/tensorboard .`

The image will only need to be rebuilt when a new dependency is added or an existing
dependency is updated.

Once the image is successfully built you can easily start up a development environment
with the following command

```
docker run \
    -p 6006:6006 \
    -v $PWD/tensorboard:/tensorboard/tensorboard \
    -v $MY_LOG_DIR:/logdir \
    tensorflow/tensorboard \
    ibazel run tensorboard:dev -- --logdir /logdir --bind_all
```

TensorBoard will now be accessible at [localhost:6006](http://localhost:6006)

For continued development you may want to either save the compiled project with
another volume mount or else plan to reuse the same container to prevent having
to repeatedly clean compile the project.

Note that it may still be necessary to run tensorboard natively in order to test
compatibility with other platforms (i.e. OSX)

### Debugging Polymer UI Tests Locally

Our UI tests (e.g., //tensorboard/components/vz_sorting/test) for our polymer code base
use HTML import which is now deprecated from all browsers (Chrome 79- had the native
support)and is run without any polyfills. In order to debug tests, you may want to
run a a Chromium used by our CI that supports HTML import. It can be found in
`./bazel-bin/third_party/chromium/chromium.out` (exact path to binary will
differ by OS you are on; for Linux, the full path is
`./bazel-bin/third_party/chromium/chromium.out/chrome-linux/chrome`).

For example of the vz_sorting test,

```sh
# Run the debug instance of the test. It should run a web server at a dynamic
# port.
bazel run tensorboard/components/vz_sorting/test:test_web_library

# In another tab:

# Fetch, if missing, the Chromium
bazel build third_party/chromium
./bazel-bin/third_party/chromium/chromium.out/chrome-linux/chrome

# Lastly, put the address returnd by the web server into the Chromium.
```

### Debugging Angular UI Tests Locally

Here is a short summary of the various commands and their primary function. Please see below for more details. We recommand using `ibazel test` for regular work and `bazel run` for deep dive debugging.

- `bazel test/run`: runs tests once and done.
- `ibazel test`: supports file watching.
- `ibazel run`: provides karma console breakpoint debugging; does not support file watching.
- Both `ibazel test` and `ibazel run` supports `console.log` and `fit/fdescribe`, which are used to narrow down the test amount.

1.  Just run all webapp tests. The job stops after finished. `console.log` is not
    supported. Not handy on debugging.

    ```sh
    (tf)$ bazel test //tensorboard/webapp/...
    ```

2.  Using `ibazel` to auto detect the file changes and use target
    `karma_test_chromium-local` for running on _webapp_ tests.

    ```sh
    (tf)$ ibazel test //tensorboard/webapp/... --test_output=all
    ```

    - `--test_output=all`: for displaying number of tests if using '`fit`'.

3.  To run on a specific test, we can change the target (with `chromium-local`
    suffix). For example,

    ```sh
    //  Run webapp tests on `karma_test` target
    (tf)$ ibazel test //tensorboard/webapp:karma_test_chromium-local

    //  Run notification center tests on `notification_center_test` target
    (tf)$ ibazel test //tensorboard/webapp/notification_center:notification_center_test_chromium-local
    ```

4.  For running a karma console to set break points for debugging purpose, use
    `bazel run`. Access the karma console at port `9876` (For example, `http://<YOUR_SERVER_ADDRESS>:9876/`) and click 'DEBUG' button, it pops up another page, where you have to use browser developer console for better debugging.

    ```sh
    (tf)$ bazel run //tensorboard/webapp:karma_test_chromium-local
    ```

    However, you cannot use `ibazel run` in this case. The file watcher is glitchy on running the tests
    when detecting changes. It shows '`a broken pipe`' in terminal. We need to terminate and restart the program manually.

## Adding, Updating, or Removing Frontend Dependencies

For the most part, frontend-specific third-party dependencies are hosted by
[npm](https://docs.npmjs.com/about-npm) and managed by
[yarn](https://classic.yarnpkg.com/).

The source of truth for `yarn` is a combination of the `package.json` and
`yarn.lock` files. `package.json` is maintained by us developers and describes
direct dependencies while `yarn.lock` is maintained by the system and describes
the entire tree of transitive dependencies. In reality both files are often
edited automatically by calls to `yarn` and `package.json` only sometimes needs
to be edited by hand.

1.  Install [yarn](https://classic.yarnpkg.com/lang/en/docs/install).

2.  Add or modify an entry in the `[dependencies]` or `[devDependencies]`
    section of `package.json`. You can do this manually but often it's preferred
    to use `yarn` from the command line:

    - `yarn add`
      - https://classic.yarnpkg.com/lang/en/docs/cli/add/
    - `yarn upgrade`
      - See: https://classic.yarnpkg.com/lang/en/docs/cli/upgrade/
      - Alternatively, use `yarn upgrade-interactive`, possibly with the
        `--latest` flag to use an interactive shell tool to hand pick
        dependencies to upgrade.
      - See: https://classic.yarnpkg.com/lang/en/docs/cli/upgrade-interactive/
    - `yarn remove`
      - https://classic.yarnpkg.com/lang/en/docs/cli/remove/

3.  Run `yarn run yarn-deduplicate`.

4.  Rebuild and test TensorBoard to make sure it works:
    * `rm -rf node_modules; bazel clean --expunge; yarn`
    * `bazel run tensorboard -- --logdir <your favorite logdir>`
    * `bazel test --test_output=errors tensorboard/webapp/... tensorboard/components/... tensorboard/plugins/...`

## Updating rules_nodejs

The [bazel](https://bazel.build/) rules we use for compiling, bundling, testing,
and running our frontend code come from
[rules_nodejs](https://github.com/bazelbuild/rules_nodejs).

When upgrading rules_nodejs we generally must also consider upgrading:
* The npm packages scoped with `@bazel`
* The rules_sass bazel library
* The bazel version

Sample upgrade: https://github.com/tensorflow/tensorboard/pull/5977

1.  Determine which version of rules_nodejs to upgrade to and find its release
    notes in https://github.com/bazelbuild/rules_nodejs/releases. Read the
    upgrade instructions for that release and every other release since our
    previous upgrade. Typically these instructions follow the same pattern but
    there are occasionally special instructions, especially for major releases.
    Make a mental note of any of these special instructions.

2.  Update the `build_bazel_rules_nodejs` `http_archive` in `MODULE.bazel` as
    described in the rules_nodejs release notes. Review
    `patches/rules_nodejs_5_8_1_bzlmod.patch` and
    `third_party/nodejs_extensions.bzl` for compatibility changes that can be
    removed or must be updated with the archive.

3.  Update npm packages scoped with `@bazel` in package.json using yarn.
    * Use the same version as the rules_nodejs version.
    * See the previous section for instructions on how to use yarn.

4.  Update the `gzgz_rules_sass` dependency and Sass toolchain in
    `MODULE.bazel`. Review TensorBoard's Sass adapter and patches whenever its
    Starlark or npm integration changes.

5.  Update the minimum bazel version to match the one supported by rules_nodejs:
    * Examine https://github.com/bazelbuild/rules_nodejs/blob/stable/index.bzl
      and find the SUPPORTED_BAZEL_VERSIONS constant.
    * Compare the supported Bazel version from rules_nodejs with the version
      pinned in `.bazelversion` and constrained by `MODULE.bazel`. Update those
      files and `.github/workflows/ci.yml` together if the project deliberately
      changes Bazel versions.

6.  Attempt to rebuild and test TensorBoard to make sure it works:
    * `rm -rf node_modules; bazel clean --expunge; yarn`
    * `bazel run tensorboard --logdir <your favorite logdir>`
    * `bazel test --test_output=errors tensorboard/webapp/... tensorboard/components/... tensorboard/plugins/...`

7.  The first attempt to rebuild and test TensorBoard rarely works. Investigate
    the problems and fix them. At this point, some of the special instructions in
    the rules_nodejs release notes (from Step 1) might be helpful.

8.  Generate mirrors for the new versions of rules_nodejs and rules_sass and
    update their `MODULE.bazel` source URLs.
    Googlers, see information at go/tensorboard-tf-mirror.

## Updating Angular

Angular is the UI framework we use for most new UI functionality. A new major
version of Angular is released every 6 months and, so, we try to upgrade our
Angular dependency at least twice a year.

Helpful documents, especially for determining correct versions of dependencies:
* Angular upgrade docs at https://update.angular.io/
  * For example: [Angular 13 to 14 upgrade](https://update.angular.io/?l=3&v=13.0-14.0 )
* Ngrx upgrade docs at https://dev.to/ngrx
  * For example, [Ngrx 14 upgrade announcement](https://dev.to/ngrx/announcing-ngrx-v14-action-groups-componentstore-lifecycle-hooks-eslint-package-revamped-ngrx-component-and-more-18ck)
* Npm website at https://www.npmjs.com/
  * For example, [lookup the available versions of `@angular/core`](https://www.npmjs.com/package/@angular/core)

When upgrading Angular we generally must consider upgrading the following
dependencies listed in `package.json`. They should be upgraded using
`yarn upgrade` as described
[in this section](#adding-updating-or-removing-frontend-dependencies).

* All `@angular/*` and `@angular-devkit/*` dependencies.
  * Except `@angular/build-tooling`, for which we currently don't have any
    upgrade policy/guidance. It is acceptable to leave this alone unless you
    discover a need to upgrade it.
  * Most of these should be upgraded to the ~same version. The easiest is to
    upgrade to the latest version for each subdependency (within the major
    series being upgraded to).
* `typescript`
  * The Angular and Ngrx upgrade documents will explain which version is
    expected.
* All `@ngrx/*` dependencies.
  * Ngrx should be on the same major version as Angular.
* `rxjs`
  * The Ngrx upgrade documentation will explain which version of rxjs to
    upgrade to.
* `zone.js`
  * This is generally not well documented. You can attempt to upgrade to
    the latest version but sometimes you have to guess at the most recent
    version that is compatible with the version of Angular.
* `ngx-color-picker`
  * Similarly, the latest version might be fine but you also might have to guess
    at the most recent version that is compatible with the version fo Angular.

Sample upgrades:
  * Angular 13: https://github.com/tensorflow/tensorboard/pull/6063.
  * Angular 14: https://github.com/tensorflow/tensorboard/pull/6066.

The builds and tests are unlikely to work on the first try and you will have to
investigate and fix breakages due to changes in behavior.
