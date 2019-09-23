# What-If Tool witwidget package releases

## Release 1.4.0

### Features
- #2607 - Add ability to set custom distance function for counterfactuals and distance
  visualizations.
- #2461 - Add ability to sort PD plots by interestingness.
- #2660 - Add ability to consume arbitrary prediction-time information.
- #2678 - Can now slice by numeric features in Performance & Fairness tab.
- #2647 - Add counterfactual analysis for regression models.
- #2663 - Visual updates for displaying attributions.
- #2630 - Added developers guide documentation.

### Notable Bug Fixes
- #2682 - Fix issue with threshold sliders not updating on fairness button presses.
- #2669 - Fix PD plots in python3.
- #2648 - Fix image handling broken from Polymer 2 update.

## To release a new version of witwidget on PyPI and NPM:

1. Ensure updated version numbers have been merged to the master branch in
tensorboard/plugins/interactive_inference/witwidget/version.py
and tensorboard/plugins/interactive_inference/witwidget/notebook/jupyter/js/package.json
2. Clone this repository and checkout the commit that set the new version numbers.
3. `bazel run tensorboard/plugins/interactive_inference/witwidget/pip_package:build_pip_package`
4. Upload the whl files created by the previous step to PyPI as per instructions
at https://packaging.python.org/tutorials/packaging-projects/#uploading-the-distribution-archives.
5. Publish the new NPM package through running `npm publish` in the `js/` subdirectory of the package
files generated during the build step.

