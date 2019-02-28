---
name: Bug/Performance Issue
about: Use this template for reporting a bug or a performance issue.

---

<em>Please make sure that this is a bug. As per our [GitHub Policy](https://github.com/tensorflow/tensorflow/blob/master/ISSUES.md), we only address code/doc bugs, performance issues, feature requests and build/installation issues on GitHub. tag:bug_template</em>

Consider Stack Overflow for getting support using TensorBoard - they have a larger community with better searchability:

https://stackoverflow.com/questions/tagged/tensorboard

**System information**
- Tensorboard version(from pip package, also printed out when running `tensorboard`) :
- TensorFlow version if different from TensorBoard :
- OS Platform and version (e.g., Linux Ubuntu 16.04) :
- Python version (e.g. 2.7, 3.5) :
- For browser-related issues :
  - Browser type and version (e.g. Chrome 64.0.3282.140) :
  - Screenshot if it's a visual issue :


You can collect some of this information using our environment capture [script](https://github.com/tensorflow/tensorflow/tree/master/tools/tf_env_collect.sh)
You can also obtain the TensorFlow version with
python -c "import tensorflow as tf; print(tf.GIT_VERSION, tf.VERSION)"

**Describe the current behavior**

**Describe the expected behavior**

**Code to reproduce the issue**
Please describe the bug as clearly as possible, and if possible provide a minimal example (code, data, and/or command line) to reproduce the issue.

**Other info / logs**
Include any logs or source code that would be helpful to diagnose the problem. If including tracebacks, please include the full traceback. Large logs and files should be attached.
