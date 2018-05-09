# TensorBoard Mutant Inference Plugin

## Model Understanding through Training Example Mutations

- Do you have a Classification or Regression problem?
- Is your data in tf.Example format?

If so, the TensorBoard Mutant Inference Plugin is for you!

### What is it?

The Mutant Inference Plugin automatically mutates each feature within a training
example of your choice, to show you how predictions would change. The range that
each feature is mutated over is automatically inferred from your training data,
but can also be adjusted manually.

### How to Use
It’s easy to try out the Mutant Inference Plugin. You just need a server serving
your model through [Tensorflow Serving](https://github.com/tensorflow/serving),
and a running instance of TensorBoard.

1. Start Model Server (if you don’t have one already for your model).

   See [Tensorflow Serving](https://github.com/tensorflow/serving) tutorials.
   This plugin assumes you have Tensorflow Serving installed.
   Example code:
   ```
   tensorflow_model_server --port=[desired port] --model_name=[desired model name] --model_base_path=[saved model base path]
   ```

2. Start TensorBoard.

3. Use the plugin.

   Select the Mutant Inference from the plugin selector.

   Fill in the fields on the left-hand side:
   - Inference address: The host:port of your running model server.
   - Model name: The model name provided when running the model server.
   - Examples path: Path to TFRecord file of tf.Examples to be sent to the
     served model.
   - Example index: The index of the tf.Example in the provided examples file
     to be used by the plugin.

   Go through different examples by changing example index and then
   closing/reopening the tabs. Is the model behaving as expected, or is it
   surprising in any way?
