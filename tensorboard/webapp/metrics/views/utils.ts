/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
const IGNORED_TAG_SUFFIX = '/scalar_summary';

export function getTagDisplayName(
  tag: string,
  groupName: string | null
): string {
  // Remove group name prefix.
  let result = tag;
  if (groupName && tag.startsWith(groupName + '/')) {
    result = tag.slice(groupName.length + 1);
  }
  // Remove the V1 scalar summary suffix. See traditional TB logic in
  // tensorboard/plugins/scalar/tf_scalar_dashboard/tf-scalar-dashboard.html
  if (result.endsWith(IGNORED_TAG_SUFFIX)) {
    result = result.slice(0, -IGNORED_TAG_SUFFIX.length);
  }

  return result || tag;
}
