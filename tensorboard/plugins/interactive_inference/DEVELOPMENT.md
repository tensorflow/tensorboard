# What-If Tool Development Guide

## First-time Setup

1. Install [Bazel](https://docs.bazel.build/versions/master/install.html)
(for building OSS code) and [Docker](https://docs.docker.com/install/)
(for hosting TF models using [TensorFlow Serving](https://github.com/tensorflow/serving)
when testing WIT in TensorBoard).
2. Install pip and virtualenv
   `sudo apt-get install python-pip python3-pip virtualenv`
3. Create a virtualenv for OSS TensorBoard development
   `virtualenv ~/tf` (or whereever you want to save this environment)
4. Create a fork of the official TensorBoard github repo through the GitHub UI
5. Clone your fork to your computer
   `cd ~/github && git clone https://github.com/[yourGitHubUsername]/tensorboard.git`
6. Install TensorFlow Serving through docker
   `docker pull tensorflow/serving`

## Development Workflow

1. Enter your TF/TB development virtualenv
   `source ~/tf/bin/activate`
2. Run TensorBoard, WIT notebooks, and/or WIT demos
   `cd ~/github/tensorboard`
    - For WIT demos, follow the directions in the [README](./README.md#i-dont-want-to-read-this-document-can-i-just-play-with-a-demo).
        1. `bazel run tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard/demo:<demoRule>`
        2. Navigate to `http://localhost:6006/tf-interactive-inference-dashboard/<demoName>.html`
    - For use in notebook mode, build the witwidget pip package locally and use it in a notebook.
        1. `rm -rf /tmp/wit-pip` (if it already exists)
        2. `bazel run tensorboard/plugins/interactive_inference/witwidget/pip_package:build_pip_package`
        3. Install the package
            - For use in Jupyter notebooks, install and enable the locally-build pip package per instructions in the [README](./README.md#how-do-i-enable-it-for-use-in-a-jupyter-notebook), but instead use `pip install <pathToBuiltPipPackageWhlFile>`, then launch the jupyter notebook kernel.
            - For use in Colab notebooks, upload the package to the notebook and install it from there
                1. In a notebook cell, to upload a file from local disk, run
                    ```
                    from google.colab import file
                    uploaded = files.upload()
                    ```
                2. In a notebook cell, to install the uploaded pip package, run `!pip install <nameOfPackage.whl>`.
                   If witwidget was previously installed, uninstall it first.<br>
    - For TensorBoard use, run tensorboard with any logdir (as WIT does not rely on logdir).<br>
      `bazel run tensorboard -- --logdir /tmp`
        1. WIT needs a served model to query, so serve your trained model through the TF serving docker container.<br>
           `sudo docker run -p 8500:8500 --mount type=bind,source=<pathToSavedModel>,target=/models/my_model/ -e MODEL_NAME=my_model -t tensorflow/serving`
            - When developing model comparison, serve multiple models at once using the proper config as seen in the appendix.<br>
                `sudo docker run -p 8500:8500 --mount type=bind,source=<pathToSavedModel1>,target=/models/my_model1 -e When you want to shutdown the served model, find the container ID and stop the container.MODEL_NAME=my_model_1 --mount type=bind,source=<pathToSavedModel2>,target=/models/my_model_2 -e MODEL_NAME=my_model_2 When you want to shutdown the served model, find the container ID and stop the container.--mount type=bind,source=<pathToConfigFile>,target=/models/models.config -t tensorflow/serving --model_config_file="/models/models.config"`
        2. Navigate to the WIT tab in TensorBoard and set-up WIT (`http://localhost:6006/#whatif&inferenceAddress=localhost%3A8500&modelName=my_model`).<br>
           The inferenceAddress and modelName settings point to the model you served in the previous step. Set all other appropriate options and click “accept”.
        3. When you want to shutdown the served model, find the container ID and stop the container.
            ```
            sudo docker container ls
            sudo docker stop <containerIdFromLsOutput>
            ```
3. The python code has unit tests
   ```
   bazel test tensorboard/plugins/interactive_inference/...
   ```
4. Add/commit your code changes on a branch in your fork and push it to github.
5. In the github UI for the master tensorboard repo, create a pull request from your pushed branch.

## Code Overview

### Backend (Python)

[interactive_inference_plugin.py](interactive_inference_plugin.py) - the python web backend code for the WIT plugin to TensorBoard. Handles requests from the browser (like load examples, infer examples, …). Loads data from disk. Sends inference requests to servo. Sends responses back to the browser.<br>
[interactive_inference_plugin_test.py]() - UT<br>

[utils/common_utils.py](./utils/common_utils.py) - utilities common to other python files<br>
[utils/inference_utils.py](./utils/inference_utils.py) - utility functions for running inference requests through a model<br>
[utils/inference_utils_test.py](./utils/inference_utils_test.py) - UT<br>
[utils/platform_utils.py](./utils/platform_utils.py) - functions specific to the open-source implementation (loading examples from disk, calling to servo)<br>
[utils/test_utils.py](./utils/test_utils.py) - helper functions for UTs<br>

[witwidget/notebook/base.py](witwidget/notebook/base.py) - WitWidgetBase class definition for using WIT in notebooks. Shared base class for both jupyter and colab implementations<br>
[witwidget/notebook/visualization.py](witwidget/notebook/visualization.py) - WitConfigBuilder class definition for using WIT in notebooks<br>

[witwidget/notebook/colab/wit.py](witwidget/notebook/colab/wit.py) - backend for running in colab, along with front-end glue code to display WIT in colab<br>

[witwidget/notebook/jupyter/wit.py](witwidget/notebook/jupyter/wit.py) - backend for running in jupyter<br>
[witwidget/notebook/jupyter/js/lib/wit.js](witwidget/notebook/jupyter/js/lib/wit.js) - front-end glue code to display WIT in jupyter<br>

### Front-end

[tf_interactive_inference_dashboard/tf-interactive-inference-dashboard.html](tf_interactive_inference_dashboard/tf-interactive-inference-dashboard.html) - top-level polymer element and most of the code for the WIT front-end<br>
[tf_interactive_inference_dashboard/tf-confusion-matrix.html](tf_interactive_inference_dashboard/tf-confusion-matrix.html) - polymer element for the confusion matrix<br>
[tf_interactive_inference_dashboard/tf-inference-panel.html](tf_interactive_inference_dashboard/tf-inference-panel.html) - polymer element for the set-up controls<br>
[tf_interactive_inference_dashboard/tf-inference-viewer.html](tf_interactive_inference_dashboard/tf-inference-viewer.html) - polymer element for the inference results table<br>

### Demos

[tf_interactive_inference_dashboard/demo/tf-interactive-inference-*-demo.html](tf_interactive_inference_dashboard/demo/) - the code for the standalone web demos of WIT that load a tensorflow.js model and some data from json and runs WIT<br>

### Miscellaneous

[tensorboard/components/vz_example_viewer/vz-example-viewer.*](https://https://github.com/tensorflow/tensorboard/tree/master/tensorboard/components/vz_example_viewer) - polymer element for the individual example viewer/editor<br>

## Appendix

### Serving multiple models: models.config contents

```
model_config_list: {

config: {
    name: "my_model_1",
    base_path: "/models/my_model_1",
    model_platform: "tensorflow"
    },
config: {
    name: "my_model_2",
    base_path: "/models/my_model_2",
    model_platform: "tensorflow"
    }
}
```
