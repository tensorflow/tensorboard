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
export declare interface Experiment {
  id: string;
  repository_id?: string;
  name: string;
  start_time: number;
  owner?: string;
  description?: string;
  hparams?: string;
  tags?: string[];
  related_links?: Array<{name: string; url: string}>;
  // The resource name of the default table serving the metrics data of the
  // experiment, as in https://google.aip.dev/122. Format:
  // repos/{repo-id}/tables/{table-id}
  default_metrics_data_source?: string;
  metrics_data_sources?: MetricsDataSource[];
  // These state values were chosen to follow these AIPs
  // https://google.aip.dev/164 and https://google.aip.dev/216.
  // However, we replaced 'delete' with 'hidden' as this feature is different
  // from the soft delete described in the AIP. In this case 'hidden' simply
  // means that the experiment is not shown in the experiment list.
  state?: 'active' | 'hidden' | 'unspecified';
}

export declare interface MetricsDataSource {
  // The resource name of the table serving the metrics data of the
  // experiment, as in https://google.aip.dev/122. Format:
  // repos/{repo-id}/tables/{table-id}
  name: string;
  repo_id: string;
  table_id: string;
  // An arbitrary url associated with this data source.
  // It would often be a link to another tool where the data can be viewed, but
  // it could also just point to some documentation, or something else relevant.
  url?: string;
}

export interface ExperimentAlias {
  aliasText: string;
  aliasNumber: number;
}
