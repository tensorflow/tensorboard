# TensorBoard Interactive Inference Dashboard

The Interactive Inference Dashboard provides an easy-to-use interface for
expanding understanding of a black-box ML model.
With the plugin, you can perform inference on a large set of examples and
immediately visualize the results.
Additionally, examples can be edited directly in the plugin and sent for
inference, in order to see the result of the changes on the model output.

## Required Input

To use the plugin, only the following information needs to be provided:

* The model server host and port, served using [TensorFlow Serving](https://github.com/tensorflow/serving).
* A TFRecord file of tf.Examples to perform inference on and the
  number of examples to load from the file.
    * Can handle up to tens of thousands of examples. The exact amount depends
      on the size of each example (how large the feature values are).
* An indication if the model is a classification or regression model.
    * Currently those are the two model types supported.
* An optional vocab file for the labels for a classification model. This file
  maps the preidcted class indices returned from the model prediction into class
  labels. The text file contains one label per line, corresponding to the class
  indices returned by the model, starting with index 0.
    * If this file is provided, then the dashboard will show the predicted
      labels for a classification model. If not, it will show the predicted
      class indices.

The information can be provided through the controls on the left-hand side of
the dashboard, or directly through the URL. Additionally, changing the input
through the controls automatically updates the URL so that it can be shared with
others for them to view the same data in the inference plugin.

## Workflow

Here is an example workflow of using this dashboard:

1.  Set a path to the examples and number of desired examples and click the “get
    examples” button.
2.  The examples are visualized in [Facets Dive](https://github.com/pair-code/facets).
    *   For non-image examples, each example is represented by a single point in
        the visualization. Facets Dive will automatically select a feature
        column to color the examples by and another feature column to use as the
        display name for each example. The key for these selections can be seen
        in the bottom-left of the visualization.
    *   If the examples contain encoded images (as per the go/tf-example spec),
        then each example is represented by a thumbnail of the image.
    *   Through the left-side menus, the examples can be positioned/faceted by
        the values in any feature column. The feature columns for the labels and
        colors can also be changed.
3.  Set a path to the model being served and select if the model is
    classification or regression using the toggle buttons. Click the “run
    inference” button.
4.  Once inference is completed, the examples in Facets Dive will now be colored
    by their inference result. Additionally, the inference result is now also
    available as another way to position or facets each example through the
    Facets Dive left-side controls.
5.  Click on any example in Facets Dive (or select multiple examples through
    control-click). Those examples will be visualized below Facets Dive using
    the vz-example-viewer component. Besides each selected example will be a
    display of the inference result.
    *   For examples that contain encoded images, the image will be displayed in
        the example viewer.
6.  Change any feature value in the example viewer for any number of examples.
    *   Notice that the inference value for that example has now disappeared, as
        the example has changed since inference. The example is now colored grey
        (meaning it has no inference value) in Facets Dive.
    *   You can edit numeric and string feature values in the text boxes.
    *   You can add and delete features and feature values using the appropriate
        buttons.
    *   You can replace encoded images by dragging and dropping a new image file
        into the existing image.
7.  Click the “run inference” button again. Inference will re-run for the
    changed examples.

## Classification Thresholds

If you are analyzing a classification model, there will be additional controls
in the side panel for controlling classification thresholds.

When performing classification, you can set the positive label threshold, which
is between 0 and 1, so that only classifcations above the set threshold are
considered valid. If the top classification's score for a given example doesn't
meet that threshold, then it will be instead visualized as being of the default
class, which is class 0.

Imagine the case of a binary classifier (therefore the classification labels are
0 and 1). If you set the threshold to 0.8, then only classifications that return
label 1 with a score of 0.8 or higher will be visualized as belonging to label
1. Without overriding the default threshold, any label 1 classifacation with a
score above 0.5 will be visualized as belonging to label 1.

Additionally, you can select a single feature in the data and set different
threholds for the different possible values of that feature. One example usage
would be setting different classification thresholds for different values of
some sensitive feature to explore fairness constraints such as "Equality of
Odds".

## Possible Uses

This dashboard instead offers an interactive approach to model understanding
through inference results.
Here are just some possible uses of the plugin:

*   Creating a confusion matrix of actual vs. predicted labels.
*   Debugging a model that is giving an unexpected return for a specific example
    or set of examples, by changing feature values and observing the change in
    prediction.
*   Interactively exploring performance across a set of features by faceting and
    positioning examples.
*   Quickly exploring an image-based model across a set of given images by
    dragging new images into a selected example in the Example Viewer and
    rerunning inference.
*   Investigating model fairness across feature columns, looking at performance
    while individually setting classification thresholds per feature value.
*   Sanity-checking models.
*   Manually investigating counterfactual examples.
