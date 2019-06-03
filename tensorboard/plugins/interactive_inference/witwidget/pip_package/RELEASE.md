# To release a new version of witwidget on PyPI and NPM:
 
1. Update tensorboard/plugins/interactive_inference/witwidget/version.py (set release version, remove 'dev')
2. Update version number in tensorboard/plugins/interactive_inference/witwidget/notebook/jupyter/js/package.json
3. `bazel run tensorboard/plugins/interactive_inference/witwidget/pip_package:build_pip_package`
4. Upload the whl files created by the previous step to PyPI as per instructions
at https://packaging.python.org/tutorials/packaging-projects/#uploading-the-distribution-archives.
5. Publish the new NPM package through running "npm publish" in the "js/" subdirectory of the package files generated in step 3.
6. Commit the version changes.

