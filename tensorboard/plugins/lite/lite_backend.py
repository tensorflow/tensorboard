import traceback
import os
import subprocess

import tensorflow as tf
from google.protobuf import text_format


# Checks whether dependency is met.
is_supported = False
try:
  _lite_v1 = tf.compat.v1.lite
  _get_potentially_supported_ops = _lite_v1.experimental.get_potentially_supported_ops
  _TFLiteConverter = _lite_v1.TFLiteConverter
  _gfile = tf.io.gfile.walk
  is_supported = True
except AttributeError:
  pass


ISSUE_LINK = "https://github.com/tensorflow/tensorflow/issues/new?template=40-tflite-op-request.md"
SELECT_TF_OPS_LINK = "https://www.tensorflow.org/lite/using_select_tf_ops"


def _get_suggestion(error):
  """Gets suggestion by identifying error message."""
  error_str = str(error)
  suggestion_map = {
      "both shapes must be equal":
          "Please input your input_shapes",
      ISSUE_LINK:
          "Please report the error log to {}, or try select TensorFlow ops: {}."
          .format(ISSUE_LINK, SELECT_TF_OPS_LINK),
      "a Tensor which does not exist": 
          "please check your input_arrays and output_arrays argument."
  }
  for k in suggestion_map:
    if k in error_str:
      return suggestion_map[k]
  return ""


class ConvertError(Exception):
  """Error occurs in TF Lite conversion."""

  def __init__(self, from_exception, suggestion=None):
    super(ConvertError, self).__init__(str(from_exception))
    self.error = from_exception
    self.type = type(from_exception).__name__
    self.suggestion = suggestion
    self.stack_trace = traceback.format_exc()


def get_exception_info(e):
  """Gets formated exception infor."""
  if not isinstance(e, ConvertError):
    e = ConvertError(e)
  return {'type': e.type,
          'error': e.error,
          'suggestion': e.suggestion,
          'stack_trace': e.stack_trace}


def script_from_saved_model(saved_model_dir, output_file, input_arrays,
                            output_arrays):
  """Generates a script for saved model to convert from TF to TF Lite."""
  return r"""# --- Python code ---
import tensorflow as tf
lite = tf.compat.v1.lite

saved_model_dir = '{saved_model_dir}'
output_file = '{output_file}'
converter = lite.TFLiteConverter.from_saved_model(
    saved_model_dir,
    input_arrays={input_arrays},
    output_arrays={output_arrays})
tflite_model = converter.convert()
with tf.io.gfile.GFile(output_file, 'wb') as f:
  f.write(tflite_model)
  print('Write file: %s' % output_file)
""".format(
    saved_model_dir=saved_model_dir,
    output_file=output_file,
    input_arrays=input_arrays,
    output_arrays=output_arrays)


def execute(script, verbose=False):
  """Executes script from subprocess, and returns tuple(success, stdout, stderr)."""
  cmds = ['python', '-c', script]
  if verbose:
    print('Execute: %s' % cmds)
  pipe = subprocess.Popen(cmds,
                          stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE)
  stdout, stderr = pipe.communicate()
  success = (pipe.returncode == 0)
  return success, stdout, stderr


def get_potentially_supported_ops():
  """Gets potentially supported ops.

  Returns:
    list of str for op names.
  """
  supported_ops = _get_potentially_supported_ops()
  op_names = [s.op for s in supported_ops]
  return op_names


def get_saved_model_dirs(logdir):
  """Gets a list of nested saved model dirs."""
  maybe_contains_dirs = []
  for dirname, subdirs, files in tf.io.gfile.walk(logdir):
    relpath = os.path.relpath(dirname, logdir)
    for d in subdirs:
      subdir = os.path.normpath(os.path.join(relpath, d))
      if tf.saved_model.contains_saved_model(os.path.join(logdir, subdir)):
        maybe_contains_dirs.append(subdir)
  return maybe_contains_dirs


def safe_makedirs(dirpath):
  """Ensures dir is made, and safely handles errors."""
  try:
      if not tf.io.gfile.exists(dirpath):
        tf.io.gfile.makedirs(dirpath)
        return True
  except:
    pass
  return False


"""
# from tensorflow.python.framework.errors import Suggestion
# from tensorflow.lite.python.tflite_convert import run_tflite_convert
# from tensorflow.python.tools.freeze_graph import run_freeze_graph

def make_args_from_session(sess, graph_def_file, tflite_file, options):
  input_nodes = []
  input_shapes = []
  output_nodes = []
  output_dir = os.path.dirname(tflite_file)

  for node in options['input_nodes']:
    tensor = sess.graph.get_tensor_by_name(node + ":0")
    input_nodes.append(node)
    shape = tensor.shape.as_list()
    if len(shape) > 0 and (shape[0] == -1 or shape[0] is None):
      shape[0] = options['batch_size']
    input_shapes.append(','.join(map(str, shape)))

  for node in options['output_nodes']:
    # check whether output node is valid.
    _ = sess.graph.get_tensor_by_name(node + ":0")
    output_nodes.append(node)

  if is_frozen_graph(sess):
    frozen_graph_file = graph_def_file
    freeze_args = None
  else:
    frozen_graph_file = os.path.join(output_dir, 'frozen.pb')
    checkpoint = options['checkpoint']
    freeze_args = [
      '--input_checkpoint={}'.format(checkpoint),
      '--output_graph={}'.format(frozen_graph_file),
      '--output_node_names={}'.format(','.join(output_nodes))]

    if tf.gfile.Exists(checkpoint + '.meta'):
      freeze_args.append('--input_meta_graph={}'.format(checkpoint + '.meta'))
      freeze_args.append('--input_binary=true')
    else:
      freeze_args.append('--input_graph={}'.format(graph_def_file))
      freeze_args.append('--input_binary=false')

  convert_args = ["--graph_def_file={}".format(frozen_graph_file),
                  "--input_format=TENSORFLOW_GRAPHDEF",
                  "--output_format=TFLITE",
                  "--output_file={}".format(tflite_file),
                  "--inference_type=FLOAT",  # TODO how to set it
                  "--input_type=FLOAT",  # TODO how to set it
                  "--input_arrays={}".format(",".join(input_nodes)),
                  "--output_arrays={}".format(",".join(output_nodes)),
                  "--input_shapes={}".format(":".join(input_shapes))]
  return freeze_args, convert_args


def parse_input_graph_proto(input_graph):
  # https://www.tensorflow.org/extend/tool_developers/
  is_binary = (input_graph.split('.')[-1] == 'pb')
  mode = "rb" if is_binary else "r"
  input_graph_def = tf.GraphDef()
  with tf.gfile.FastGFile(input_graph, mode) as f:
    if is_binary:
      input_graph_def.ParseFromString(f.read())
    else:
      text_format.Merge(f.read(), input_graph_def)
  return input_graph_def


def is_frozen_graph(sess):
  for op in sess.graph.get_operations():
    if op.type.startswith("Variable") or op.type.endswith("VariableOp"):
      return False
  return True


def make_args(graph_def_file, tflite_file, options):
  if tf.io.gfile.exists(graph_def_file):
    graph_def = parse_input_graph_proto(graph_def_file)
    with tf.Graph().as_default():
      with tf.Session() as sess:
        tf.import_graph_def(graph_def, name='')
        return make_args_from_session(sess, graph_def_file, tflite_file, options)
  else:
    meta_file = options['checkpoint'] + '.meta'
    if tf.io.gfile.exists(meta_file):
      with tf.Session() as sess:
        saver = tf.train.import_meta_graph(meta_file, clear_devices=True)
        saver.restore(sess, options['checkpoint'])
        return make_args_from_session(sess, graph_def_file, tflite_file, options)
    else:
      raise ValueError('no model file or checkpoint meta file')


def freeze_and_convert(graph_def_file, tflite_file, options):
  try:
    freeze_args, convert_args = make_args(graph_def_file, tflite_file, options)
  except Exception as e:
    raise ConvertError(e, _get_suggestion(e))

  if freeze_args is not None:
    run_freeze_graph(freeze_args)
  run_tflite_convert(convert_args)


def get_freeze_and_convert_script(graph_def_file, tflite_file, options):
  try:
    freeze_args, convert_args = make_args(graph_def_file, tflite_file, options)
  except Exception as e:
    raise ConvertError(e, _get_suggestion(e))

  script = ''
  line_continuation = ' \\\n    '

  if freeze_args is not None:
    script += '# freeze graph\n'
    script += 'freeze_graph ' + line_continuation.join(freeze_args)
    script += '\n\n'

  script += '# convert to tflite file\n'
  script += 'tflite_convert ' + line_continuation.join(convert_args)
  script += '\n'

  return script


def get_checkpoint_names(logdir):
  return [os.path.splitext(f)[0] for f in os.listdir(logdir) if '.ckpt' in f and '.meta' in f]


if __name__ == '__main__':
  graph_def_file = "model_dir/graph.pbtxt"
  options = {
    "input_nodes": ["dnn/input_from_feature_columns/input_layer/concat"],
    "output_nodes": ["dnn/head/predictions/probabilities", "dnn/head/predictions/str_classes"],
    "batch_size": 1,
    'checkpoint': 'model_dir/model.ckpt-400'
  }

  try:
    freeze_and_convert(graph_def_file, "model_dir/test.tflite", options)
  except Exception as e:
    print(e)

  try:
    script = get_freeze_and_convert_script(graph_def_file, "model_dir/test.tflite", options)
    print(script)
  except Exception as e:
    print(e)
"""