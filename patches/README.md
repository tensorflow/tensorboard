# TensorBoard patches using patch-package.

We use [patch-package](https://www.npmjs.com/package/patch-package) to apply
TensorBoard-specific patches to some of our npm/yarn dependencies.

To regenerate @bazel/concatjs patch:
* vi "node_modules/@bazel/concatjs/web_test/karma.conf.js"
* make edits
* yarn patch-package "@bazel/concatjs"

