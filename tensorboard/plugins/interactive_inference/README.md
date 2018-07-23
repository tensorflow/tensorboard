# What-If Tool

![What-If Tool Screenshot](/tensorboard/plugins/interactive_inference/img/wit-smile-intro.png "What-If Tool Screenshot")

The What-If Tool (WIT) provides an easy-to-use interface for expanding
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
* [Binary classifier for UCI Census dataset salary prediction](https://???)
  * Dataset: [UCI Census](https://archive.ics.uci.edu/ml/datasets/census+income)
  * Task: Predict whether a person earns more or less than $50k based on their
    census information
  * To build and run the demo from code:
    `bazel run tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard/demo:demoserver`
    then navigate to `http://localhost:6006/tf-interactive-inference-dashboard/demo.html`
* [Binary classifier for smile detection in images](https://???)
  * Dataset: [CelebA](http://mmlab.ie.cuhk.edu.hk/projects/CelebA.html)
  * Task: Predict whether the person in an image is smiling
  * See below section “What can I learn about fairness?” below for a deep-dive
    into this demo.
  * To build and run the demo from code:
    `bazel run tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard/demo:imagedemoserver`
    then navigate to `http://localhost:6006/tf-interactive-inference-dashboard/image_demo.html`
* [Multiclass classifier for Iris dataset](https://???)
  * Dataset: [UCI Iris](https://archive.ics.uci.edu/ml/datasets/iris)
  * Task: Predict which of three classes of iris flowers that a flower falls
    into based on 4 measurements of the flower
  * To build and run the demo from code:
    `bazel run tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard/demo:irisdemoserver`
    then navigate to `http://localhost:6006/tf-interactive-inference-dashboard/iris_demo.html`
* [Regression model for UCI Census dataset age prediction](https://???)
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

![ROC curves and confusion matrices faceted by the “sex” feature. The current positive classification thresholds have been set based on on the "equal accuracy" fairness criteria button.](/tensorboard/plugins/interactive_inference/img/wit-census-roc.png "ROC curves and confusion matrices faceted by the “sex” feature. The current positive classification thresholds have been set based on on the "equal accuracy" fairness criteria button")

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

## What can I learn about fairness?
This section will walkthrough use of the smile detection demo through the lens
of fairness.
As a reminder, this demo uses a model that, given an image of a person, detects
if the person in that image is smiling or not (binary classification).

On the Performance/Fairness tab, we have set the “true label” feature to be
“Smiling”, so that the tool can evaluate model smile detection performance on
the 250 test images versus the true labels of those images (whether they were
human-labeled as smiling or not smiling).

In this example, we have set the ratio of false positive cost to false negative
cost to be 1 (the default), meaning that we consider a false positive just as
costly as a false negative.
We could change that ratio if we wanted to optimize our classifier in a
different way (e.x. If the smile detector was used to ensure that some action
only occurred after seeing a smile, we would probably want a higher cost for
false positives than false negatives, to avoid incorrectly performing that
action.
Then we clicked the “optimize threshold” button to find the decision threshold
of the classifier over these 250 examples that is the least costly (makes the
fewest mistakes).

The threshold was determined to be .67, leading to 14% of our examples as being
incorrectly classified.
This threshold means that only when the model is at least 67% confident that the
image contains a smile will it report back that it detected a smile.
Any other threshold you set will lead to a higher percentage of incorrectly
classified examples on our sample.

![Smile examples faceted](/tensorboard/plugins/interactive_inference/img/wit-smile-fullscreen.png "Smile examples faceted")

In the above screenshot, we have set up the left-side of the screen to show two
separate groups of images, images of young people and images of older people.
Each group is laid out with the X axis representing how confident the model
thinks the image contains a smile (left side being not confident at all).
Additionally, each image is colored by if the classifier was correct (red
meaning incorrect, blue meaning correct).
This helps us see where the model is making mistakes, specifically in regards to
young people vs. older people.

Let’s dive deeper into performance on young vs older images. We select the
“Young” feature to investigate fairness by, through the dropdown menu on the
right side. We immediately see that with the threshold set to .67 for both
groups that the model significantly outperforms on young people compared to
older people.
The model is incorrect on over 23% of older samples, compared to just 11% of
younger samples.

![Single threshold](/tensorboard/plugins/interactive_inference/img/wit-smile-single-threshold.png "Single threshold")

If we click the button to optimize the thresholds individually for each group,
we see that the best it can do on older samples is to get over 18% incorrect,
versus 11% for younger samples. The model has a significantly higher rate of
false positives for the older samples.

![Individual thresholds](/tensorboard/plugins/interactive_inference/img/wit-smile-individual-thresholds.png "Individual thresholds")

Fairness of a classifier between different subgroups (such as young people
versus older people) can be thought of in multiple ways.
There are many measures of fairness and it can be shown mathematically that it
is impossible to optimize a classifier for all of these different measures.
One such measure of fairness is called “demographic parity” and it refers to
when a classifier predicts the positive class (in this case, smiling) the same
percentage of the time for both classes (young images and older images).

If we click the “Demographic parity” button, the thresholds for the two groups
are set independently in a way that tries to minimize the cost of the mistakes
while maintaining demographic parity.
You can see the parity in the two circled numbers in the below screenshot.
But notice that in order to achieve this parity, you end up with a classifier
that has false positives on older images at over 3 times the rate of younger
images (10.2% vs 3.1%).
So, while technically this fairness measure has been achieved, the classifier
will incorrectly claim smiles on older images much more frequently than younger
images.

![Demographic parity](/tensorboard/plugins/interactive_inference/img/wit-smile-demographic-parity.png "Demographic parity")

Another fairness measure is called equal accuracy, which refers to when a
classifier predicts correctly (either a true negative case or a true positive
case) the same percentage of the time for both classes.
Clicking the “Equal Accuracy” button sets the thresholds in such a way that both
classifiers have an accuracy of about 18.8%, which is well below the best
possible performance of the classifier on young images.
Satisfying this fairness measure causes our classifier to be unnecessarily
bad on young images, with over 16% of images being falsely classified as
smiling.

![Equal accuracy](/tensorboard/plugins/interactive_inference/img/wit-smile-equal-acc.png "Equal accuracy")

Lastly, the tool exposes another fairness measure, called equal opportunity.
In this context, opportunity is defined as the percentage of examples that were
predicted positive that were correctly predicted as positive (e.x. If 10 images
in some group were predicted as smiling, but only 7 of those images were
actually smiling, then the opportunity measure there is 7/10 = 0.7).
Equal opportunity refers to when a classifier has the same opportunity measure
for different groups.

When clicking the “Equal opportunity” button, the thresholds are set in a way
where the percentages of true positives and false negatives are similar between
groups, but the older images have a much higher false positive rate than the
younger images (11.9% vs 2.6%).

![Equal opporitunity](/tensorboard/plugins/interactive_inference/img/wit-smile-equal-oppo.png "Equal opporitunity")

Through this investigation, we’ve shown that the classifier is clearly less
accurate on older images.
We’ve also shown what sacrifices need to be made by our classifier if we wish
to set different thresholds on younger and older images in different ways to
satisfy different measures of fairness.

This investigation doesn’t uncover a root cause for the fundamental unfairness
of our classifier but does show that there is such as issue.
This investigation could lead one to dig back into the training of this model,
where they would discover that the data used to actually train this model only
consisted of young images. No older images were included in the training data,
leading to this unfairness.
If the model is retrained including older images from this CelebA dataset, the
massive age-related performance gap does go away.
