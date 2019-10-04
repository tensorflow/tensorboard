# What-If Tool

![What-If Tool Screenshot](/tensorboard/plugins/interactive_inference/img/wit-smile-intro.png "What-If Tool Screenshot")

The [What-If Tool](https://pair-code.github.io/what-if-tool) (WIT) provides an easy-to-use interface for expanding
understanding of a black-box classification or regression ML model.
With the plugin, you can perform inference on a large set of examples and
immediately visualize the results in a variety of ways.
Additionally, examples can be edited manually or programmatically and re-run
through the model in order to see the results of the changes.
It contains tooling for investigating model performance and fairness over
subsets of a dataset.

The purpose of the tool is that give people a simple, intuitive, and powerful
way to play with a trained ML model on a set of data through a visual interface
with absolutely no code required.

The tool can be accessed through TensorBoard or as an extension in a Jupyter
or
[Colab](https://colab.research.google.com/github/tensorflow/tensorboard/blob/master/tensorboard/plugins/interactive_inference/What_If_Tool_Notebook_Usage.ipynb)
notebook.

## I don’t want to read this document. Can I just play with a demo?

Check out the large set of web and colab demos in the
[demo section of the What-If Tool website](https://pair-code.github.io/what-if-tool/index.html#demos).

To build the web demos yourself:
* [Binary classifier for UCI Census dataset salary prediction](https://pair-code.github.io/what-if-tool/uci.html)
  * Dataset: [UCI Census](https://archive.ics.uci.edu/ml/datasets/census+income)
  * Task: Predict whether a person earns more or less than $50k based on their
    census information
  * To build and run the demo from code:
    `bazel run tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard/demo:demoserver`
    then navigate to `http://localhost:6006/tf-interactive-inference-dashboard/demo.html`
* [Binary classifier for smile detection in images](https://pair-code.github.io/what-if-tool/image.html)
  * Dataset: [CelebA](http://mmlab.ie.cuhk.edu.hk/projects/CelebA.html)
  * Task: Predict whether the person in an image is smiling
  * To build and run the demo from code:
    `bazel run tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard/demo:imagedemoserver`
    then navigate to `http://localhost:6006/tf-interactive-inference-dashboard/image_demo.html`
* [Multiclass classifier for Iris dataset](https://pair-code.github.io/what-if-tool/iris.html)
  * Dataset: [UCI Iris](https://archive.ics.uci.edu/ml/datasets/iris)
  * Task: Predict which of three classes of iris flowers that a flower falls
    into based on 4 measurements of the flower
  * To build and run the demo from code:
    `bazel run tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard/demo:irisdemoserver`
    then navigate to `http://localhost:6006/tf-interactive-inference-dashboard/iris_demo.html`
* [Regression model for UCI Census dataset age prediction](https://pair-code.github.io/what-if-tool/age.html)
  * Dataset: [UCI Census](https://archive.ics.uci.edu/ml/datasets/census+income)
  * Task: Predict the age of a person based on their census information
  * To build and run the demo from code:
    `bazel run tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard/demo:agedemoserver`
    then navigate to `http://localhost:6006/tf-interactive-inference-dashboard/age_demo.html`

## What do I need to use it in a jupyter or colab notebook?

You can use the What-If Tool to analyze a classification or regression
[TensorFlow Estimator](https://www.tensorflow.org/api_docs/python/tf/estimator/Estimator)
that takes TensorFlow Example or SequenceExample protos
(data points) as inputs directly in a jupyter or colab notebook.

Additionally, the What-If Tool can analyze
[AI Platform Prediction-hosted](https://cloud.google.com/ml-engine/) classification
or regresssion models that take TensorFlow Example protos, SequenceExample protos,
or raw JSON objects as inputs.

You can also use What-If Tool with a custom prediction function that takes
Tensorflow examples and produces predictions. In this mode, you can load any model
(including non-TensorFlow models that don't use Example protos as inputs) as
long as your custom function's input and output specifications are correct.

If you want to train an ML model from a dataset and explore the dataset and
model, check out the [What_If_Tool_Notebook_Usage.ipynb notebook](https://colab.research.google.com/github/tensorflow/tensorboard/blob/master/tensorboard/plugins/interactive_inference/What_If_Tool_Notebook_Usage.ipynb) in colab, which starts from a CSV file,
converts the data to tf.Example protos, trains a classifier, and then uses the
What-If Tool to show the classifier performance on the data.

## What do I need to use it in TensorBoard?

A walkthrough of using the tool in TensorBoard, including a pretrained model and
test dataset, can be found on the
[What-If Tool page on the TensorBoard website](https://www.tensorflow.org/tensorboard/r2/what_if_tool).

To use the tool in TensorBoard, only the following information needs to be provided:

* The model server host and port, served using
  [TensorFlow Serving](https://github.com/tensorflow/serving). The model can
  use the TensorFlow Serving Classification, Regression, or Predict API.
    * Information on how to create a saved model with the `Estimator` API that
      will use thse appropriate TensorFlow Serving Classification or Regression
      APIs can be found in the [saved model documentation](https://www.tensorflow.org/guide/saved_model#using_savedmodel_with_estimators)
      and in this [helpful tutorial](http://shzhangji.com/blog/2018/05/14/serve-tensorflow-estimator-with-savedmodel/).
      Models that use these APIs are the simplest to use with the What-If Tool
      as they require no set-up in the tool beyond setting the model type.
    * If the model uses the Predict API, the input must be serialized tf.Example
      or tf.SequenceExample protos and the output must be following:
        * For classification models, the output must include a 2D float tensor
          containing a list of class probabilities for all possible class
          indices for each inferred example.
        * For regression models, the output must include a float tensor
          containing a single regression score for each inferred example.
    * The What-If Tool queries the served model using the gRPC API, not the
      RESTful API. See the TensorFlow Serving
      [docker documentation](https://www.tensorflow.org/serving/docker) for
      more information on the two APIs. The docker image uses port 8500 for the
      gRPC API, so if using the docker approach, the port to specify in the
      What-If Tool will be 8500.
* A TFRecord file of tf.Examples or tf.SequenceExamples to perform inference on
  and the number of examples to load from the file.
    * Can handle up to tens of thousands of examples. The exact amount depends
      on the size of each example (how many features there are and how large the
      feature values are).
* An indication if the model is a regression, binary classification or
  multi-class classification model.
* An optional vocab file for the labels for a classification model. This file
  maps the preidcted class indices returned from the model prediction into class
  labels. The text file contains one label per line, corresponding to the class
  indices returned by the model, starting with index 0.
    * If this file is provided, then the dashboard will show the predicted
      labels for a classification model. If not, it will show the predicted
      class indices.

Alternatively, the What-If Tool can be used to explore a dataset directly from
a CSV file. See the next section for details.

The information can be provided in the settings dialog screen, which pops up
automatically upon opening this tool and is accessible through the settings
icon button in the top-right of the tool.
The information can also be provided directly through URL parameters.
Changing the settings through the controls automatically updates the URL so that
it can be shared with others for them to view the same data in the What-If Tool.

### All I have is a dataset. What can I do in TensorBoard? Where do I start?

If you just want to explore the information in a CSV file using the What-If Tool
in TensorBoard, just set the path to the examples to the file (with a ".csv"
extension) and leave the inference address and model name fields blank.
The first line of the CSV file must contain column names. Each line after that
contains one example from the dataset, with values for each of the columns
defined on the first line. The pipe character ("|") deliminates separate feature
values in a list of feature values for a given feature.

In order to make use of the model understanding features of the tool, you can
have columns in your dataset that contain the output from an ML model. If your
file has a column named "predictions__probabilities" with a pipe-delimited ("|") list of
probability scores (between 0 and 1), then the tool will treat those as the
output scores of a classification model. If your file has a numeric column named
"predictions" then the tool will treat those as the output of a regression model. In
this way, the tool can be used to analyze any dataset and the results of any
model run offline against the dataset. Note that in this mode, the examples
aren't editable as there is no way to get new inference results when an example
changes.

## What can it do?

Details on the capabilities of the tool, including a guided walkthrough, can be
found on the [What-If Tool website](https://pair-code.github.io/what-if-tool).
Here is a basic rundown of what it can do:

* Visualize a dataset of TensorFlow Example protos.
  * The main panel shows the dataset using [Facets Dive](https://pair-code.github.io/facets),
    where the examples can be organized/sliced/positioned/colored by any of the
    dataset’s features.
    * The examples can also be organized by the results of their inferences.
      * For classification models, this includes inferred label, confidence of
        inferred label, and inference correctness.
      * For regression models, this includes inferred score and amount of error
        (including absolute or squared error) in the inference.
  * A selected example can be viewed in detail in the side panel, showing all
    feature values for all features of that example.
  * For examples that contain an encoded image in a bytes feature named
    "image/encoded", Facets Dive will create a thumbnail of the image to display
    the point, and the full-size image is visible in the side panel for a
    selected example.
  * Aggregate statistics for all loaded examples can be viewed in the side panel
    using [Facets Overview](https://pair-code.github.io/facets/).

* Visualize the results of the inference
  * By default, examples in the main panel are colored by their inference
    results.
  * The examples in the main panel can be organized into confusion matrices and
    other custom layouts to show the inference results faceted by a number of
    different features, or faceted/positioned by inference result, allowing the
    creation of small multiples of 1D and 2D histograms and scatter plots.
  * For a selected example, detailed inference results (e.x. predicted classes
    and their confidence scores) are shown in the side panel.

* Explore counterfactual examples
  * For classification models, for any selected example, with one click you can
    compare the example to the example most-similar to it but which is
    classified as a different.
  * Similarity is calculated based on the distribution of feature values across
    all loaded examples and similarity can be calculated using either L1 or L2
    distance.
    * Distance is normalized between features by:
      * For numeric features, use the distance between values divided by the
        standard deviation of the values across all examples.
      * For categorical features, the distance is 0 if the values are the same,
        otherwise the distance is the probability that any two examples have
        the same value for that feature across all examples.
  * In notebook mode, the tool also allows you to set a custom distance function
    using set_custom_distance_fn in WitConfigBuilder, where that function is
    used to compute closest counterfactuals instead. As in the case with
    custom_predict_fn, the custom distance function can be any python function.

* Edit a selected example in the browser and re-run inference and visualize the
  difference in the inference results.
  * See auto-generated partial dependence plots, which are plots that for every
    feature show the change in inference results as that feature has its value
    changed to different valid values for that feature.
  * Edit/add/remove any feature or feature value in the side panel and re-run
    inference on the edited datapoint. A history of the inference values of that
    point as it is edited and re-inferred is shown.
  * For examples that contain encoded images, upload your own image and re-run
    inference.
  * Clone an existing example for editing/comparison.
  * Revert edits to an edited example.

* Compare the results of two models on the same input data.
  * If you provide two models to the tool during setup, it will run inference
    with the provided data on both models and you can compare the results
    between the two models using all the features defined above.

* If using a binary classification model and your examples include a feature
  that describes the true label, you can do the following:
  * See the ROC curve and numeric confusion matrices in the side panel,
    including the point on the curve where your model lives, given the current
    positive classification threshold value.
  * See separate ROC curves and numeric confusion matrices split out for subsets
    of the dataset, sliced of any feature or features of your dataset (i.e. by
    gender).
  * Manually adjust the positive classification threshold (or thresholds, if
    slicing the dataset by a feature) and see the difference in inference
    results, ROC curve position and confusion matrices immediately.
  * Set the positive classification thresholds with one click based on concepts
    such as the cost of a false positive vs a false negative and satisfying
    fairness measures such as equality of opportunity or demographic parity.

* If using a multi-class classification model and your examples include a
  feature that describes the true label, you can do the following:
  * See a confusion matrix in the side panel for all classifications and all
    classes.
  * See separate confusion matrices split out for subsets of the dataset, sliced
    on any feature or features of your dataset.
* If using a regression model and your examples include a feature that describes
  the true label, you can do the following:
  * See the mean error, mean absolute error and mean squared error across the
    dataset.
  * See separate calculations of those mean error calculations split out for
    subsets of the dataset, sliced of any feature or features of your dataset.

## Who is it for?
We imagine WIT to be useful for a wide variety of users.
* ML researchers and model developers - Investigate your datasets and models and
  explore inference results. Poke at the data and model to gain insights, for
  tasks such as debugging strange results and looking into ML fairness.
* Non-technical stakeholders - Gain an understanding of the performance of a
  model on a dataset. Try it out with your own data.
* Lay users - Learn about machine learning by interactively playing with
  datasets and models.

## Notebook mode details

As seen in the [example notebook](https://colab.research.google.com/github/tensorflow/tensorboard/blob/master/tensorboard/plugins/interactive_inference/What_If_Tool_Notebook_Usage.ipynb),
creating the `WitWidget` object is what causes the What-If Tool to be displayed
in an output cell. The `WitWidget` object takes a `WitConfigBuilder` object as a
constructor argument. The `WitConfigBuilder` object specifies the data and model
information that the What-If Tool will use.

The WitConfigBuilder object takes a list of tf.Example or tf.SequenceExample
protos as a constructor argument. These protos will be shown in the tool and
inferred in the specified model.

The model to be used for inference by the tool can be specified in many ways:
- As a TensorFlow [Estimator](https://www.tensorflow.org/guide/estimators)
  object that is provided through the `set_estimator_and_feature_spec` method.
  In this case the inference will be done inside the notebook using the
  provided estimator.
- As a model hosted by [AI Platform Prediction](https://cloud.google.com/ml-engine/)
  through the`set_ai_platform_model` method.
- As a custom prediction function provided through `set_custom_predict_fn` method.
  In this case WIT will directly call the function for inference.
- As an endpoint for a model being served by [TensorFlow Serving](https://github.com/tensorflow/serving),
  through the `set_inference_address` and `set_model_name` methods. In this case
  the inference will be done on the model server specified. To query a model served
  on host "localhost" on port 8888, named "my_model", you would set on your
  builder
  `builder.set_inference_address('localhost:8888').set_model_name('my_model')`.

See the documentation of [WitConfigBuilder](https://github.com/tensorflow/tensorboard/blob/master/tensorboard/plugins/interactive_inference/witwidget/notebook/visualization.py)
for all options you can provide, including how to specify other model types
(defaults to binary classification) and how to specify an optional second model
to compare to the first model.

### How do I enable it for use in a Jupyter notebook?
First, install and enable WIT for Jupyter through the following commands:
```sh
pip install witwidget
jupyter nbextension install --py --symlink --sys-prefix witwidget
jupyter nbextension enable --py --sys-prefix witwidget
```
Note that if you use TensorFlow with GPU support (tensorflow-gpu), then you
should instead install the GPU-compatible version of witwidget:
```sh
pip install witwidget-gpu
jupyter nbextension install --py --symlink --sys-prefix witwidget
jupyter nbextension enable --py --sys-prefix witwidget
```

Then, use it as seen at the bottom of the
[What_If_Tool_Notebook_Usage.ipynb notebook](./What_If_Tool_Notebook_Usage.ipynb).

### How do I enable it for use in a Colab notebook?
Install the widget into the runtime of the notebook kernel by running a cell
containing:
```
!pip install witwidget
```
For TensorFlow GPU support, use the `witwidget-gpu` package instead of `witwidget`.

Then, use it as seen at the bottom of the
[What_If_Tool_Notebook_Usage.ipynb notebook](https://colab.research.google.com/github/tensorflow/tensorboard/blob/master/tensorboard/plugins/interactive_inference/What_If_Tool_Notebook_Usage.ipynb).

### How do I enable it for use in a JupyterLab or Cloud AI Platform notebook?
Install and enable WIT for JupyterLab by running a cell containing:
```
!pip install witwidget
!jupyter labextension install wit-widget
!jupyter labextension install @jupyter-widgets/jupyterlab-manager
```
For TensorFlow GPU support, use the `witwidget-gpu` package instead of `witwidget`.
Note that you may need to run `!sudo jupyter labextension ...` commands depending on your notebook setup.

Use of WIT after installation is the same as with the other notebook installations.

## How can I help develop it?

Check out the [developement guide](./DEVELOPMENT.md).
