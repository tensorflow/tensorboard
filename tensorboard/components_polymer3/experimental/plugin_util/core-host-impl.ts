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
/**
 * Implements core plugin APIs.
 */
tb_plugin.host.listen('experimental.GetURLPluginData', (context) => {
  if (!context) {
    return;
  }
  const prefix = `p.${context.pluginName}.`;
  const result: {[key: string]: string} = {};

  for (let key in tf_storage.urlDict) {
    if (key.startsWith(prefix)) {
      const pluginKey = key.substring(prefix.length);
      result[pluginKey] = tf_storage.urlDict[key];
    }
  }
  return result;
});
