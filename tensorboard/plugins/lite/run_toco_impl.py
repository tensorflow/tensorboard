import os
import tensorflow as tf

from google.protobuf import text_format
from tensorflow.core.framework import graph_pb2
from tensorflow.python.platform import gfile
from tensorboard.plugins.lite.tflite_convert import run_toco_with_suggestion
from tensorboard.plugins.lite.freeze_graph import freeze_with_suggestion

from tensorboard.plugins.lite.suggestion import Suggestion

class ArgsSuggestion(Suggestion):
  def __init__(self, from_exception, stack_trace=None):
    Suggestion.__init__(self, from_exception, stack_trace)

  @classmethod
  def _get_error_map(cls):
    return {"a Tensor which does not exist": "please check your input_array arguments"}


def parse_input_graph_proto(input_graph):

    # https://www.tensorflow.org/extend/tool_developers/
    if not tf.gfile.Exists(input_graph):
        print("Input graph file '" + input_graph + "' does not exist!")
        return -1

    if input_graph.split('.')[-1] == 'pb':
        input_binary = True
    else:
        input_binary = False

    input_graph_def = tf.GraphDef()

    mode = "rb" if input_binary else "r"
    with tf.gfile.FastGFile(input_graph, mode) as f:
        if input_binary:
            input_graph_def.ParseFromString(f.read())
        else:
            text_format.Merge(f.read(), input_graph_def)

    return input_graph_def


def write_summary_of_graph(pb_file, log_dir):
    with tf.Session() as sess:
        graph = parse_input_graph_proto(pb_file)
        tf.import_graph_def(graph, name='')
        train_writer = tf.summary.FileWriter(log_dir)
        train_writer.add_graph(sess.graph)


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
        print("xxxxxxxxxxxxxxxxx")
        print(shape)
        if len(shape) > 0 and (shape[0] == -1 or shape[0] is None):
            shape[0] = options['batch_size']
        input_shapes.append(','.join(map(str, shape)))

    for node in options['output_nodes']:
        tensor = sess.graph.get_tensor_by_name(node + ":0")
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
                    "--inference_type=FLOAT", #TODO how to set it
                    "--input_type=FLOAT", #TODO how to set it
                    "--input_arrays={}".format(",".join(input_nodes)),
                    "--output_arrays={}".format(",".join(output_nodes)),
                    "--input_shapes={}".format(":".join(input_shapes))]
    print(freeze_args)
    print(convert_args)
    return freeze_args, convert_args


def make_args(graph_def_file, tflite_file, options):
    graph_def = parse_input_graph_proto(graph_def_file)
    with tf.Graph().as_default():
        with tf.Session() as sess:
            tf.import_graph_def(graph_def, name='')
            return make_args_from_session(sess, graph_def_file, tflite_file, options)


def freeze_and_convert(graph_def_file, tflite_file, options):
    try:
      freeze_args, convert_args = make_args(graph_def_file, tflite_file, options)
    except Exception as e:
        raise ArgsSuggestion(e)

    if freeze_args is not None:
        freeze_with_suggestion(freeze_args)

    run_toco_with_suggestion(convert_args)

    script = ''
    line_continuation = ' \\\n    '
    if freeze_args is not None:
        script += 'freeze_graph ' + line_continuation.join(freeze_args)

    script += '\n\n'
    script += 'tflite_convert ' + line_continuation.join(convert_args)
    script += '\n'

    return script


if __name__ == '__main__':

    graph_def_file = "model_dir/graph.pbtxt"
    options = {
        "input_nodes": ["dnn/input_from_feature_columns/input_layer/concat"],
        "output_nodes": ["dnn/head/predictions/probabilities"],
        "batch_size": 1,
        'checkpoint': 'model_dir/model.ckpt-400'
    }
    script = freeze_and_convert(graph_def_file, "model_dir/test.tflite", options)
    print(script)
