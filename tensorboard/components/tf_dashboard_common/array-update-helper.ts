/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_dashboard_common {

/**
 * @polymerBehavior
 */
export const ArrayUpdateHelper = {
  updateArrayProp(
      prop: string,
      value: Array<any>,
      getKey: (item: any, ind: number) => string) {
    let orig = this.get(prop);
    const newVal = value;

    if (!Array.isArray(newVal)) {
      throw RangeError(`Expected new value to '${prop}' to be an array.`);
    }

    // In case using ComplexObserver, the method can be invoked before the prop
    // had a chance to initialize properly.
    if (!Array.isArray(orig)) {
      orig = [];
      this.set(prop, orig);
    }

    const lookup = new Set(newVal.map((item, i) => getKey(item, i)));

    let origInd = 0;
    let newValInd = 0;
    while (origInd < orig.length && newValInd < newVal.length) {
      if (!lookup.has(getKey(orig[origInd], origInd))) {
        this.splice(prop, origInd, 1);
        continue;
      } else if (getKey(orig[origInd], origInd) ==
          getKey(newVal[newValInd], newValInd)) {
        // update the element.
        // TODO(stephanwlee): We may be able to update the original reference of
        // the `value` by deep-copying the new value over.
        this.set(`${prop}.${origInd}`, newVal[newValInd]);
      } else {
        this.splice(prop, origInd, 0, newVal[newValInd]);
      }
      newValInd++;
      origInd++;
    }
    if (origInd < orig.length) {
      this.splice(prop, origInd);
    }
    if (newValInd < newVal.length) {
      this.push(prop, ...newVal.slice(newValInd));
    }
  },
};

}  // namespace tf_dashboard_common
