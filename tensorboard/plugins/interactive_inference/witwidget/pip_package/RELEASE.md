# To release a new version of witwidget on PyPI:
 
1. Update tensorboard/plugins/interactive_inference/witwidget/version.py (set release version, remove 'dev')
2. Update tensorboard/plugins/interactive_inference/witwidget/notebook/jupyter/js/package.json
with the same release version.
3. `bazel run tensorboard/plugins/interactive_inference/witwidget/pip_package:build_pip_package`
4. Upload the whl files created by the previous step to PyPI as per instructions
at https://packaging.python.org/tutorials/packaging-projects/#uploading-the-distribution-archives.
4. Commit the version.py and package.json changes.
