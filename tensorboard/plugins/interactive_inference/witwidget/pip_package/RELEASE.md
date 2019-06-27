# To release a new version of witwidget on PyPI and NPM:

1. Ensure updated version numbers have been merged to the master branch in
tensorboard/plugins/interactive_inference/witwidget/version.py
and tensorboard/plugins/interactive_inference/witwidget/notebook/jupyter/js/package.json
2. Clone this repository and checkout the commit that set the new version numbers.
3. `bazel run tensorboard/plugins/interactive_inference/witwidget/pip_package:build_pip_package`
4. Upload the whl files created by the previous step to PyPI as per instructions
at https://packaging.python.org/tutorials/packaging-projects/#uploading-the-distribution-archives.
5. Publish the new NPM package through running `npm publish` in the `js/` subdirectory of the package
files generated during the build step.

