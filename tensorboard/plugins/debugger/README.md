# The Debugger Dashboard

The debugger dashboard offers a graphical user interface for the [TensorFlow debugger](https://www.tensorflow.org/versions/r1.1/programmers_guide/debugger). For instance, this dashboard

* enables users to pause execution at specified ops or continue execution for some number of steps.
* visualizes values of tensors.
* associates tensors with specific lines in python code.

![The Debugger Dashboard](images/debugger_intro.png)

# Setup

## Instrumenting Model Logic

To use this dashboard, construct a `TensorBoardDebugWrapperSession`. Subsequently, that wrapper session will issue [gRPC](https://grpc.io/docs/guides/) messages to TensorBoard that containing data for debugging.

The constructor accepts these parameters.

1. the original `tf.Session` object.
2. the `[[host]]:[[port]]` address to which to stream gRPC messages.

Example logic:

```python
from tensorflow.python import debug as tf_debug
sess = tf.Session()
sess = tf_debug.TensorBoardDebugWrapperSession(sess, 'localhost:6064')
sess.run(my_fetches)
```

## Start TensorBoard with the `debugger_port` flag.

In addition to instrumenting the model, the user must pass the `debugger_port` flag to TensorBoard. This port number matches the one above. TensorBoard will then both receive gRPC messages from and issue gRPC messages to model logic.

This example command demonstrates how to start TensorBoard:

```
tensorboard \
    --logdir ~/project_foo/model_bar_logdir \
    --port 6006 \
    --debugger_port 6064 \
;
```

## Navigating to TensorBoard

Navigate to the debugger dashboard within TensorBoard based on which port it serves on (specified via the `port` flag). For instance, the URL might be `http://localhost:6006#debugger`.

Initially, a dialog may indicate that the dashboard is waiting on a session run to begin. The dialog will hide once the latter happens.

![Dialog on waiting for the first session run](images/debugger_dialog.png)

# Selecting Ops

To examine the output value of an op, ops in the graph must be first selected. Subsequently, the debugger dashboard will pause runs at those ops, enabling users to examine outputs of those ops.

## The Node List

Ops can be selected via the the node list on the top left:

![Node list](images/node_list.png)

Toggling a checkbox next to an entire scope selects or deselects all ops under the scope. The checkbox for a scope is orange if some but not all of the ops within it are selected.

The ops shown in the list may be filtered by regex based on name or type. Afterwards, ops may be more efficiently selected by the user.

![Select ops by regex](images/regex_node_list.png)

Clicking the link next to an op makes the graph explorer pan to it (and expand nodes if need be to show the op):

![Make the graph explorer pan to a node](images/node_linking.png)

## The Graph Explorer

The graph explorer (on the right side of the dashboard) offers another way to select an op: A context menu appears when an op is right-clicked.

The user can then chose to either

1. Set a breakpoint at the op (equivalent to selecting in the node list).
2. Continue to the op. This convenient option sets the breakpoint and then continues execution to the op.

![Add a breakpoint via the graph explorer](images/context_menu.png)

# Controlling Execution

After selecting nodes, the user can continue execution for a certain number of session runs by clicking *Continue*:

![The continue button](images/continue_button.png)

Clicking the button opens a dialog that lets the user specify how many session runs to execute. Execution will pause at breakpoints (selected ops).

![The continue dialog](images/continue_dialog.png)

Via this dialog, the user may specify breakpoints based on conditions (in addition to the breakpoints that are based on selected ops):

* When a tensor contains any bad (NaN, or +/- Infinity) values.
* When a tensor contains any +/- Infinity values.
* When a tensor contains any NaN values.
* When the max value of a tensor exceeds some constant.
* When the max value of a tensor is below some constant.
* When the min value of a tensor exceeds some constant.
* When the min value of a tensor is below some constant.
* When the (max - min) value of a tensor exceeds some constant.
* When the (max - min) value of a tensor is below some constant.
* When the mean value of a tensor exceeds some constant.
* When the mean value of a tensor is below some constant.
* When the standard deviation of a tensor exceeds some constant.
* When the standard deviation of a tensor is below some constant.

These conditions bear much semblance to [filters of the TensorFlow debugger](https://www.tensorflow.org/programmers_guide/debugger#finding_nans_and_infs).

When execution is paused, the next op can be stepped to via clicking *Step*. If a program runs multiple sessions, they will be listed within the Session Runs table under the node list.

![Step to the next op](images/step.png)

# Examining Runtime Graphs

Runtime graphs for each device may be examined within the graph explorer.

As noted above, users may right-click and select ops directly within the graph. When execution pauses at an op, the graph pans to it.

![Exploring graphs](images/graph_explorer.png)

# Examining the Values of Tensors

When execution is paused, the values of output tensors for all selected ops are shown within the tensor values table (under the graph). The current op is shown in red.

![Tensor value overview](images/tensor_value_overview.png)

Also presented for each op are the name, count (the number of times the op has been executed), data type, and shape.

Next to each op is a *health pill*, which visualizes the proportion of values within the tensor that fall under each of the six categories noted in the legend. A user might use health pills to for instance pinpoint ops that are culprits for producing undesired values (such as NaN).

## Tensor Values Visualized

Note the column titled "Value". Clicking to view the value of each op adds a new card (for visualizing the tensor's value) to the Tensor Values pane.

1D tensors (such as bias in this case) are visualized with a line chart. The X axis represents the index into the tensor, while the Y axis represents the value.

Tensors with a rank of 4 are shown as images. In this example, the filter of a convolutional op is visualized. The overall contours of an MNIST digit (8) are visible.

![Tensor value visualization](images/tensor_values.png)

While execution occurs, visualizations within the tensor value cards update, letting the user view live output values of ops as animations.
