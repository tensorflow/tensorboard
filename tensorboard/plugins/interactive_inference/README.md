# What-If Tool

![What-If Tool Screenshot](/tensorboard/plugins/interactive_inference/img/wit-smile-intro.png "What-If Tool Screenshot")

The [What-If Tool](https://pair-code.github.io/what-if-tool) (WIT) provides an easy-to-use interface for expanding
understanding of a black-box ML model.
With the plugin, you can perform inference on a large set of examples and
immediately visualize the results in a variety of ways.
Additionally, examples can be edited manually or programatically and re-run
through the model in order to see the results of the changes.
It contains tooling for investigating model performance and fairness over
subsets of a dataset.

The purpose of the tool is that give people a simple, intuitive, and powerful
way to play with a trained ML model on a set of data through a visual interface
with absolutely no code required.

## I don’t want to read this document. Can I just play with a demo?

Fine, here are some demos:
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

## What do I need to use it?

To use the tool, only the following information needs to be provided:

* The model server host and port, served using
  [TensorFlow Serving](https://github.com/tensorflow/serving). The model must
  use the TensorFlow Serving Classification or Regression APIs.
    * Information on how to create a saved model with the `Estimator` API that
      will use thse appropriate TensorFlow Serving Classification or Regression
      APIs can be found in the [saved model documentation](https://www.tensorflow.org/guide/saved_model#using_savedmodel_with_estimators)
      and in this [helpful tutorial](http://shzhangji.com/blog/2018/05/14/serve-tensorflow-estimator-with-savedmodel/).
    * The What-If Tool queries the served model using the gRPC API, not the
      RESTful API. See the TensorFlow Serving
      [docker documentation](https://www.tensorflow.org/serving/docker) for
      more information on the two APIs. The docker image uses port 8500 for the
      gRPC API, so if using the docker approach, the port to specify in the
      What-If Tool will be 8500.
* A TFRecord file of tf.Examples to perform inference on and the
  number of examples to load from the file.
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

The information can be provided in the settings dialog screen, which pops up
automatically upon opening this tool and is accessible through the settings
icon button in the top-right of the tool.
The information can also be provided directly through URL parameters.
Changing the settings through the controls automatically updates the URL so that
it can be shared with others for them to view the same data in the What-If Tool.

## What can it do?
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

![Faceted examples and their aggregate statistics](/tensorboard/plugins/interactive_inference/img/wit-census-overview.png "Faceted examples and their aggregate statistics")

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


![The side panel showing new inference results after the “capital-gain” feature value has been edited.](/tensorboard/plugins/interactive_inference/img/wit-census-edit-rerun.png "The side panel showing new inference results after the “capital-gain” feature value has been edited")

![Partial dependence plots for 3 features of a selected example (see how the confidence of the positive classification changes as the feature values change](/tensorboard/plugins/interactive_inference/img/wit-census-pd.png "Partial dependence plots for 3 features of a selected example (see how the confidence of the positive classification changes as the feature values change")

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

![ROC curves and confusion matrices faceted by the sex feature. The current positive classification thresholds have been set based on the equal opporitunity fairness criteria button.](/tensorboard/plugins/interactive_inference/img/wit-census-roc.png "ROC curves and confusion matrices faceted by the sex feature. The current positive classification thresholds have been set based on the equal opporitunity fairness criteria button")

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
