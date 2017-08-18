/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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

function rgba(red: number, green: number, blue: number, alpha: number) {
  return "rgba(" + Math.round(red * 255) + "," + Math.round(green * 255) +
      "," + Math.round(blue * 255) + "," + alpha + ")";
}

export function flameColor(fraction: number, brightness = 1, opacity = 1) {
  if (isNaN(fraction)) return rgba(brightness, brightness, brightness, opacity);
  fraction = Math.sqrt(fraction);  // Or everything is depressing and red.
  return (fraction < 0.5) ?
    rgba(brightness, 2 * fraction * brightness, 0, opacity) :
    rgba(2 * (1 - fraction) * brightness, brightness, 0, opacity);
}

export function utilization(node) {
  if (!node || !node.metrics) return 0/0;
  return node.metrics.flops / node.metrics.time;
}

export function percent(fraction: number) {
  if (isNaN(fraction)) return "-";
  return fraction >= 0.995 ? "100%" : fraction < 0.00001 ? "0.00%" :
    (fraction * 100).toPrecision(2) + "%";
}
