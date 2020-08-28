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
```

TensorBoard builds are done with [Bazel](https://bazel.build), so you may need to [install Bazel](https://docs.bazel.build/versions/master/install.html). The Bazel build will automatically "vulcanize" all the HTML files and generate a "binary" launcher script. When HTML is vulcanized, it means all the script tags and HTML imports are inlined into one big HTML file. Then the Bazel build puts that index.html file inside a static assets zip. The python HTTP server then reads static assets from that zip while serving.

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

```shell
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

### iBazel: A file watcher for Bazel.

Bazel is capable of performing incremental builds where it builds only the
subset of files that are impacted by file changes. However, it does not come
with a file watcher. For an improved developer experience, start TensorBoard
with `ibazel` instead of `bazel` which will automatically re-build and start the
server when files change.

If you do not have the ibazel binary on your system, you can use the command
below.

```sh
# Optionally run `yarn` to keep `node_modules` up-to-date.
yarn run ibazel run tensorboard -- -- --logdir [LOG_DIR]
```

### Debugging UI Tests Locally

Our UI tests (e.g., //tensorboard/components/vz_sorting/test) use HTML import
which is now deprecated from all browsers (Chrome 79- had the native support)
and is run without any polyfills. In order to debug tests, you may want to run a
a Chromium used by our CI that supports HTML import. It can be found in
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
