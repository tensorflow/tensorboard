/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import * as tensorWidget from '../tensor-widget';
import {TensorViewSlicingSpec, TensorView} from '../types';
import {
  BaseTensorNumericSummary,
  BooleanOrNumericTensorNumericSummary,
} from '../health-pill-types';

// TODO(cais): Find a way to import tfjs-core here, instead of depending on
// a global variable.
declare const tf: any;

/** Check horizontal and vertical ranges are fully specified in slicing spec. */
function checkSpecifiedHorizontalAndVerticalRanges(
  slicingSpec: TensorViewSlicingSpec,
  rank: number,
  verticalOnly = false
) {
  if (!verticalOnly) {
    if (
      slicingSpec.horizontalRange === null ||
      slicingSpec.horizontalRange[0] === null ||
      slicingSpec.horizontalRange[1] === null
    ) {
      throw new Error(
        `Missing or incomplete horizontalRange range for ${rank}D tensor.`
      );
    }
  }
  if (
    slicingSpec.verticalRange === null ||
    slicingSpec.verticalRange[0] === null ||
    slicingSpec.verticalRange[1] === null
  ) {
    throw new Error(
      `Missing or incomplete verticalRange range for ${rank}D tensor.`
    );
  }
}

/**
 * Convert a TensorFlow.js tensor to a TensorView.
 */
export function tensorToTensorView(x: any): tensorWidget.TensorView {
  // TODO(cais): Do this lazily.
  const buffer = x.bufferSync();

  return {
    spec: {
      dtype: x.dtype as string,
      shape: x.shape as tensorWidget.Shape,
    },
    get: async (...indices: number[]) => {
      if (indices.length !== x.rank) {
        throw new Error(
          `indices length ${indices.length} does not match ` + `rank ${x.rank}`
        );
      }
      return buffer.get(...indices);
    },
    view: async (slicingSpec: TensorViewSlicingSpec) => {
      if (slicingSpec.depthDim != null) {
        throw new Error(`depthDim view is not supported yet.`);
      }

      const slicingDims = slicingSpec.slicingDimsAndIndices.map(
        (dimAndIndex) => dimAndIndex.dim
      );
      const slicingIndices = slicingSpec.slicingDimsAndIndices.map(
        (dimAndIndex) => {
          if (dimAndIndex.index === null) {
            throw new Error(
              'Unspecified index encountered in slicing spec: ' +
                JSON.stringify(slicingSpec, null, 2)
            );
          }
          return dimAndIndex.index;
        }
      );

      const begins: number[] = [];
      const sizes: number[] = [];

      if (x.rank === 1) {
        checkSpecifiedHorizontalAndVerticalRanges(slicingSpec, x.rank, true);
        const verticalRange = slicingSpec.verticalRange as [number, number];
        begins.push(verticalRange[0]);
        sizes.push(verticalRange[1] - verticalRange[0]);
      } else if (x.rank > 1) {
        checkSpecifiedHorizontalAndVerticalRanges(slicingSpec, x.rank);
        for (let i = 0; i < x.rank; ++i) {
          if (slicingDims.indexOf(i) !== -1) {
            // This is a slicing dimension. Get the slicing index.
            begins.push(slicingIndices[slicingDims.indexOf(i)]);
            sizes.push(1);
          } else {
            // This is one of the viewing dimension(s).
            if (slicingSpec.viewingDims.indexOf(i) === 0) {
              const verticalRange = slicingSpec.verticalRange as [
                number,
                number
              ];
              begins.push(verticalRange[0]);
              sizes.push(verticalRange[1] - verticalRange[0]);
            } else {
              const horizontalRange = slicingSpec.horizontalRange as [
                number,
                number
              ];
              begins.push(horizontalRange[0]);
              sizes.push(horizontalRange[1] - horizontalRange[0]);
            }
          }
        }
      }
      // TODO(cais): Doesn't work when slicing dimensions is not the first few
      // yet.
      const sliced =
        x.rank === 0
          ? x
          : tf.tidy(() => {
              if (x.dtype === 'string') {
                // Work around the TensorFlow.js limitation that `tf.slice()`
                // doesn't support the string dtype yet. Remove this workaround
                // once this feature request is fulfilled:
                // https://github.com/tensorflow/tfjs/issues/2010
                if (x.rank === 2) {
                  const array = x.arraySync();
                  let strMatrix: string[][] = array.slice(
                    begins[0],
                    begins[0] + sizes[0]
                  );
                  strMatrix = strMatrix.map((strArray) =>
                    strArray.slice(begins[1], begins[1] + sizes[1])
                  );
                  return tf.tensor2d(strMatrix);
                } else {
                  throw new Error(
                    `Slicing ${x.rank}D string tensor is not implemented`
                  );
                }
              } else {
                let output = x.slice(begins, sizes);
                if (slicingDims != null) {
                  output = output.squeeze(slicingDims);
                }
                return output;
              }
            });

      const retval = (await sliced.array()) as
        | boolean
        | number
        | string
        | boolean[][]
        | number[][]
        | string[][];
      if (sliced !== x) {
        tf.dispose(sliced);
      }
      // TODO(cais): Check memory leak.
      return retval;
    },
    getNumericSummary: async () => {
      if (x.dtype === 'float32' || x.dtype === 'int32' || x.dtype == 'bool') {
        // This is not an efficient way to compute the maximum and minimum of
        // finite values in a tensor. But it is okay as this is just a demo.
        const data = x.dataSync() as Float32Array;
        let minimum = Infinity;
        let maximum = -Infinity;
        for (let i = 0; i < data.length; ++i) {
          const value = data[i];
          if (!isFinite(value)) {
            continue;
          }
          if (value < minimum) {
            minimum = value;
          }
          if (value > maximum) {
            maximum = value;
          }
        }
        return {
          elementCount: x.size,
          minimum,
          maximum,
        };
      } else {
        return {elementCount: x.size};
      }
    },
  };
}

function demo() {
  (document.getElementById(
    'tensor-widget-version'
  ) as HTMLDivElement).textContent = tensorWidget.VERSION;

  /////////////////////////////////////////////////////////////
  // float32 scalar.
  const tensorDiv0 = document.getElementById('tensor0') as HTMLDivElement;
  // TODO(cais): Replace this with a TensorFlow.js-based TensorView.
  const tensorView0 = tensorToTensorView(tf.scalar(28));
  const tensorWidget0 = tensorWidget.tensorWidget(tensorDiv0, tensorView0, {
    name: 'scalar1',
  });
  tensorWidget0.render();

  /////////////////////////////////////////////////////////////
  // 1D int32 tensor.
  const tensorDiv1 = document.getElementById('tensor1') as HTMLDivElement;
  // TODO(cais): Replace this with a TensorFlow.js-based TensorView.
  const tensorView1 = tensorToTensorView(
    tf.linspace(0, 190, 20).asType('int32')
  );
  const tensorWidget1 = tensorWidget.tensorWidget(tensorDiv1, tensorView1, {
    name: 'Tensor1DOutputByAnOpWithAVeryLongName:0',
  });
  tensorWidget1.render();

  /////////////////////////////////////////////////////////////
  // 2D float32 tensor.
  const tensor2Div = document.getElementById('tensor2') as HTMLDivElement;
  const tensorView2 = tensorToTensorView(tf.randomNormal([128, 64]));
  const tensorWidget2 = tensorWidget.tensorWidget(tensor2Div, tensorView2, {
    name: 'Float32_2D_Tensor:0',
  });
  tensorWidget2.render();

  /////////////////////////////////////////////////////////////
  // 2D float32 tensor with NaN and Infinities in it.
  const tensorDiv3 = document.getElementById('tensor3') as HTMLDivElement;
  const tensorView3 = tensorToTensorView(
    tf.tensor2d([[NaN, -Infinity], [Infinity, 0]])
  );
  // const tensorView3 = tensorToTensorView(tf.tensor2d([[3, 4], [5, 6]]));
  const tensorWidget3 = tensorWidget.tensorWidget(tensorDiv3, tensorView3, {
    name: 'Tensor2D_w_badValues',
  });
  tensorWidget3.render();

  /////////////////////////////////////////////////////////////
  // 3D float32 tensor, without the optional name.
  const tensorDiv4 = document.getElementById('tensor4') as HTMLDivElement;
  const tensorView4 = tensorToTensorView(
    tf.linspace(0, (64 * 32 * 50 - 1) / 100, 64 * 32 * 50).reshape([64, 32, 50])
  );
  const tensorWidget4 = tensorWidget.tensorWidget(tensorDiv4, tensorView4); // No name.
  tensorWidget4.render();

  /////////////////////////////////////////////////////////////
  // 4D float32 tensor, without the optional name.
  const tensorDiv5 = document.getElementById('tensor5') as HTMLDivElement;
  const tensorView5 = tensorToTensorView(
    tf
      .linspace(0, (2 * 4 * 15 * 20 - 1) / 100, 2 * 4 * 15 * 20)
      .reshape([2, 4, 15, 20])
  );
  const tensorWidget5 = tensorWidget.tensorWidget(tensorDiv5, tensorView5, {
    name: 'FourDimensionalTensor',
  });
  tensorWidget5.render();

  /////////////////////////////////////////////////////////////
  // 3D boolean tensor.
  const tensorDiv6 = document.getElementById('tensor6') as HTMLDivElement;
  const tensorView6 = tensorToTensorView(
    tf.tensor3d([false, true, false, true, true, false, true, false], [2, 2, 2])
  );
  const tensorWidget6 = tensorWidget.tensorWidget(tensorDiv6, tensorView6, {
    name: 'booleanTensor',
  });
  tensorWidget6.render();

  /////////////////////////////////////////////////////////////
  // 2D string tensor.
  const tensorDiv7 = document.getElementById('tensor7') as HTMLDivElement;
  const tensorView7 = tensorToTensorView(
    tf.tensor2d(
      [
        'Lorem',
        'Жят',
        'العناد',
        '永和九年',
        'ipsum',
        'ыт',
        'الشمال',
        '岁在癸丑',
        'dolor',
        'жольюта',
        'بزمام',
        '暮春之初',
        'sit',
        'льаорыыт',
        'مهمّات,',
        '会于会稽山阴之兰亭',
        'amet',
        '.',
        'دارت',
        '修稧事也',
        ',',
        'Ыльит',
        'يكن',
        '群贤毕至',
        'consectetur',
        'компрэхэнжам',
        'أي',
        '少长咸集',
        'adipiscing',
        'ад',
        'حدى',
        '此地有崇山峻领',
        'elit',
        'мыа',
        'من',
        '茂林修竹',
        ',',
        'Фачтидёе',
        'الدّفاع',
        '又有清流激湍',
        'sed',
        'атоморюм',
        'ونتج',
        '映带左右',
        'do',
        'конжтетуто',
        'إذ',
        '引以为流觞曲水',
        'eiusmod',
        'нэ',
        'نفس',
        '列坐其次',
        'tempor',
        'хаж',
        'ويكيبيديا',
        '',
        'incididunt',
        ',',
        'والمعدات',
        '',
        'ut',
        'ед',
        'بـ',
        '',
      ],
      [16, 4]
    )
  );
  const tensorWidget7 = tensorWidget.tensorWidget(tensorDiv7, tensorView7, {
    name: 'LoremIpsum 兰亭集序',
  });
  tensorWidget7.render();
}

demo();
