/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

module tf.graph.op {

  /**
   * Whitelist of current Tensorflow ops valid on the TPU
   */
  export const WHITELIST = [
    'Abs','Add','AddN','All','Any','ArgMax','Assert','Assign',
    'AssignAddVariableOp','AssignSubVariableOp','AssignVariableOp','AvgPool',
    'AvgPool3D','AvgPool3DGrad','AvgPoolGrad','BatchMatMul','BatchToSpace',
    'BatchToSpaceND','BiasAdd','BiasAddGrad','BiasAddV1',
    'BroadcastGradientArgs','Cast','Ceil','CheckNumerics','Concat',
    'ConcatOffset','ConcatV2','Const','Conv2D','Conv2DBackpropFilter',
    'Conv2DBackpropInput','Conv3D','Conv3DBackpropFilterV2',
    'Conv3DBackpropInputV2','CrossReplicaSum','DepthwiseConv2dNative',
    'Diag','DiagPart','Div','DummyReadResource',
    'DynamicStitch','Elu','EluGrad','Equal',
    'Exp','ExpandDims','Fill','Floor','FloorDiv','FloorMod','Gather','Greater',
    'GreaterEqual','Identity','InfeedDequeue','InfeedDequeueTuple',
    'Inv','InvertPermutation','L2Loss','LRN','LRNGrad','Less',
    'LessEqual','LinSpace','Log','Log1p','LogSoftmax','LogicalAnd','LogicalNot',
    'LogicalOr','MatMul','MatrixDiag','MatrixDiagPart','Max','MaxPool',
    'MaxPool3D','MaxPool3DGrad','MaxPoolGrad','Maximum','Mean','Min','Minimum',
    'Mod','Mul','Neg','NoOp','NotEqual','OneHot','OnesLike','OutfeedEnqueue',
    'OutfeedEnqueueTuple','Pack','Pad','Placeholder','Pow','PreventGradient',
    'Prod','RandomStandardNormal','RandomUniform','RandomUniformInt','Range',
    'Rank','ReadVariableOp','RealDiv','Reciprocal','Relu','Relu6','Relu6Grad',
    'ReluGrad','Reshape','ApplyAdagrad','ApplyAdam',
    'ApplyGradientDescent','ApplyMomentum',
    'ApplyRMSProp','StridedSliceAssign','Reverse',
    'ReverseV2','Round','Rsqrt','RsqrtGrad','Select','Shape','ShapeN','Sigmoid',
    'SigmoidGrad','Sign','Size','Slice','Softmax',
    'SoftmaxCrossEntropyWithLogits','Softplus','SoftplusGrad','SpaceToBatch',
    'SpaceToBatchND','SparseMatMul',
    'SparseSoftmaxCrossEntropyWithLogits','Split','SplitV','Sqrt','Square',
    'SquaredDifference','Squeeze','StopGradient','StridedSlice',
    'StridedSliceGrad','Sub','Sum','SymbolicGradient',
    'Tanh','TanhGrad','Tile','Transpose',
    'TruncateDiv','TruncateMod','TruncatedNormal','Unpack','VarIsInitializedOp',
    'Variable', 'VariableV2', 'ZerosLike','_ArrayToList','_ListToArray',
    '_TPURecv','_TPUSend','_UnsafeReadVariable'
  ];

  /**
   * Returns true if OpNode graph object represents a
   * Tensorflow operation that is valid for the TPU.
   *
   * @param opNode OpNode graph object
   * @returns {boolean}
   */
  export function opValid(opNode: OpNode) : boolean {
    // If assigned a device, and it is not the TPU, assume op is valid
    if (opNode.device && opNode.device.toLowerCase().search("tpu") == -1) {
      return true;
    }
    return WHITELIST.indexOf(opNode.op) != -1;
  }

  export function checkOpsForCompatibility(graph: SlimGraph) {
    _.each(graph.nodes, (node) => {
      node.compatible = opValid(node);
      _.each(node.inEmbeddings, (node) => {
        node.compatible = opValid(node);
      });

      _.each(node.outEmbeddings, (node) => {
        node.compatible = opValid(node);
      });
    });
  }

} // close module tf.graph.op
