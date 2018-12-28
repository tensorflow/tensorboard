import os
import tensorflow as tf

from google.protobuf import text_format

try:
  from tensorflow.python.framework.errors import Suggestion
  from tensorflow.lite.python.tflite_convert import run_tflite_convert
  from tensorflow.python.tools.freeze_graph import run_freeze_graph
  tflite_support = True
except ImportError as e:
  tflite_support = False


if tflite_support:

  def list_supported_ops():
    return tf.lite.TFLiteConverter.list_supported_ops()

  class ArgsSuggestion(Suggestion):
    def __init__(self, from_exception, stack_trace=None):
      Suggestion.__init__(self, from_exception, stack_trace)

    @classmethod
    def _get_error_map(cls):
      return {"a Tensor which does not exist": "please check your input_nodes and output_nodes argument"}


  def parse_input_graph_proto(input_graph):

    # https://www.tensorflow.org/extend/tool_developers/
    input_binary = (input_graph.split('.')[-1] == 'pb')
    mode = "rb" if input_binary else "r"

    input_graph_def = tf.GraphDef()

    with tf.gfile.FastGFile(input_graph, mode) as f:
      if input_binary:
        input_graph_def.ParseFromString(f.read())
      else:
        text_format.Merge(f.read(), input_graph_def)

    return input_graph_def


  def is_frozen_graph(sess):
    for op in sess.graph.get_operations():
      if op.type.startswith("Variable") or op.type.endswith("VariableOp"):
        return False
    return True


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
    print(freeze_args)
    print(convert_args)
    return freeze_args, convert_args


  def make_args(graph_def_file, tflite_file, options):
    if tf.gfile.Exists(graph_def_file):
      graph_def = parse_input_graph_proto(graph_def_file)
      with tf.Graph().as_default():
        with tf.Session() as sess:
          tf.import_graph_def(graph_def, name='')
          return make_args_from_session(sess, graph_def_file, tflite_file, options)
    else:
      meta_file = options['checkpoint'] + '.meta'
      if tf.gfile.Exists(meta_file):
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
      raise ArgsSuggestion(e)

    if freeze_args is not None:
      run_freeze_graph(freeze_args)

    run_tflite_convert(convert_args)


  def get_freeze_and_convert_script(graph_def_file, tflite_file, options):
    try:
      freeze_args, convert_args = make_args(graph_def_file, tflite_file, options)
    except Exception as e:
      raise ArgsSuggestion(e)

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
