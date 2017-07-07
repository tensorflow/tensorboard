/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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

/*
 * This module holds the list of available dashboards and associated
 * metadata.
 *
 * TODO(@wchargin): Create this module at build time.
 */
export interface Dashboard {
  name: string;
  component: string;  // name of a Polymer component
  reloadEnabled: boolean;
}

/*
 * An array of all known dashboards, listed in the order in which they
 * should be rendered.
 *
 * TODO(@wchargin): Decentralize these, so that each dashboard
 * declares its own metadata and we simply aggregate them here.
 */
export const DASHBOARDS: Dashboard[] = [
  {
    name: 'scalars',
    component: 'tf-scalar-dashboard',
    reloadEnabled: true,
  },
  {
    name: 'images',
    component: 'tf-image-dashboard',
    reloadEnabled: true,
  },
  {
    name: 'audio',
    component: 'tf-audio-dashboard',
    reloadEnabled: true,
  },
  {
    name: 'graphs',
    component: 'tf-graph-dashboard',
    reloadEnabled: false,
  },
  {
    name: 'distributions',
    component: 'tf-distribution-dashboard',
    reloadEnabled: true,
  },
  {
    name: 'histograms',
    component: 'tf-histogram-dashboard',
    reloadEnabled: true,
  },
  {
    name: 'projector',
    component: 'vz-projector-dashboard',
    reloadEnabled: false,
  },
  {
    name: 'text',
    component: 'tf-text-dashboard',
    reloadEnabled: true,
  },
];

/**
 * An index for `DASHBOARDS` keyed against the name.
 */
export const DASHBOARDS_BY_NAME: {[name: string]: Dashboard} =
  Object.assign.apply(null, [
    {},
    ...DASHBOARDS.map((dashboard) => ({[dashboard.name]: dashboard})),
  ]);
