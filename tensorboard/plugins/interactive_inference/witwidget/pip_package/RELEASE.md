# What-If Tool witwidget package releases

## Release 1.4.3

### Notable Features
- #2787 - Add ml service name and version for CAIP.
- #2781 - Add callback creator for TFMA slicing usage.

### Notable Bug Fixes
- #2785 - Fix sliced intersection.

## Release 1.4.2

### Notable Features
- #2744 - Allow set_example to accept JSON.

### Notable Bug Fixes
- #2762 - Fix cloud model usage with JSON input.

## Release 1.4.1

Note that as of 1.4.1, if you provide a custom prediction function, and provide
your examples to WitConfigBuilder as JSON (not Example protos), then the
examples will be passed to your custom predict function in that JSON format.
This is technically a breaking API change but the existing behavior was
incorrect and this specific configuration is so rarely used that we wanted
to correct it immediately without any need for special code/flags.

### Notable Features
- #2716 - Better custom predict fn when provided JSON input.

### Notable Bug Fixes
- #2716 - Fix fairness threshold setting bug introduced in 1.4.0.

## Release 1.4.0

### Notable Features
- #2607 - Add ability to set custom distance function for counterfactuals and distance
  visualizations.
- #2461 - Add ability to sort PD plots by interestingness.
- #2660 - Add ability to consume arbitrary prediction-time information.
- #2678 - Can now slice by numeric features in Performance & Fairness tab.
- #2647 - Add counterfactual analysis for regression models.
- #2663 - Visual updates for displaying attributions.
- #2630 - Added developers guide documentation.
- #2698 - Add ability to adjust attributions.

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

