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

/**
 * A demo for tensor-widget, using TensoFlow.js tensors in the frontend.
 */

import * as tf from '@tensorflow/tfjs-core';

import {IntOrFloatTensorHealthPill} from '../health-pill-types';
import {TensorView, TensorViewSlicingSpec} from '../types';
import {tensorWidget} from '../tensor-widget';

/**
 * TODO(cais): Doc string.
 */
async function tensorViewFromTensorFlowJsTensor(x: tf.Tensor):
    Promise<TensorView> {
  if (!x.dtype.startsWith('int') &&
      !x.dtype.startsWith('float')) {
    throw new Error(`Unsupported dtype: ${x.dtype}`);
  }
  const buffer = await x.buffer();
  return {
    spec: {
      dtype: x.dtype,
      shape: x.shape,
    },
    get: async (indices: number[]) => {
      throw new Error('Not implemented.');
    },
    view: async (slicingSpec: TensorViewSlicingSpec) => {
      throw new Error('Not implemented.');
    },
    getHealthPill: async () => {
      return tf.tidy(() => {
        const isZero = tf.equal(x, 0);
        const isNegative = tf.less(x, 0);
        const isPositive = tf.greater(x, 0);
        const isInfinite = tf.isInf(x);
        const isNaN = tf.isNaN(x);
        const isFinite = tf.logicalNot(isInfinite);
        const zeroCount = isZero.asType('int32').sum().dataSync()[0];
        const negativeCount = tf.logicalAnd(
            isFinite, isNegative).asType('int32').sum().dataSync()[0];
        const positiveCount = tf.logicalAnd(
            isFinite, isPositive).asType('int32').sum().dataSync()[0];

        let negativeInfinityCount: number;
        let positiveInfinityCount: number;
        let nanCount: number;
        if (x.dtype.startsWith('float')) {
          negativeInfinityCount = tf.logicalAnd(
              isInfinite, isNegative).asType('int32').sum().dataSync()[0];
          positiveInfinityCount = tf.logicalAnd(
              isInfinite, isPositive).asType('int32').sum().dataSync()[0];
          nanCount = isNaN.asType('int32').sum().dataSync()[0];
        }

        const minimum = tf.min(x).dataSync()[0];
        const maximum = tf.max(x).dataSync()[0];
        const {mean, variance} = tf.moments(x);

        return {
          elementCount: x.size,
          zeroCount,
          negativeCount,
          positiveCount,
          negativeInfinityCount,
          positiveInfinityCount,
          nanCount,
          minimum,
          maximum,
          mean: mean.dataSync()[0],
          stdDev: Math.sqrt(variance.dataSync()[0]),
        } as IntOrFloatTensorHealthPill;
      });
    }
  }
}

async function run() {
  // // 1D tensor, int32.
  // const tensor1 = tf.linspace(0, 9, 10).asType('int32').reshape([2, 5]);
  // const widget1 = tensorWidget(
  //     document.getElementById('tensor1') as HTMLDivElement,
  //     await tensorViewFromTensorFlowJsTensor(tensor1),
  //     {name: 'tensor1'});
  // await widget1.render();

  // // 2D tensor, float32.
  // const tensor2 = tf.randomNormal([32, 40]);
  // const widget2 = tensorWidget(
  //     document.getElementById('tensor2') as HTMLDivElement,
  //     await tensorViewFromTensorFlowJsTensor(tensor2),
  //     {name: 'tensor2'});
  // await widget2.render();

  // 2D tensor, float32, with pathological values (+/-Infinity and NaN).
  const tensor3 = tf.tensor2d([1, 2, -2, -Infinity, Infinity, 0], [3, 2])
      .div(tf.tensor2d([1, 0, 0, 3, 4, 0], [3, 2]));
  const widget3 = tensorWidget(
    document.getElementById('tensor3') as HTMLDivElement,
    await tensorViewFromTensorFlowJsTensor(tensor3),
    {name: 'foo/tensorWithBadValues'});
  await widget3.render();
}

run();
