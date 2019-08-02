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
namespace tf_backend {

export type ExperimentId = number;
export type RunId = number | null;
export type TagId = number;

export type Experiment = {id: ExperimentId, name: string, startTime: number};

export type Run = {
  id: RunId,
  name: string,
  startTime: number,
  tags: Tag[],
};

export type Tag = {
  id: TagId,
  name: string,
  displayName: string,
  pluginName: string,
};

}  // namespace tf_backend
