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
import {
  DomainType,
  HparamAndMetricSpec,
  HparamSpec,
  MetricSpec,
} from '../types';

/**
 * Combines hparams and metrics spec from different experiments.
 *
 * Different experiments can be testing hypothesis on different sets of hparams
 * and metrics. This utility combines the specs when possible and throws
 * validation errors when key (`name` for hparams and `tag` for metrics) collide
 * with different specs.
 */
export function combineHparamAndMetricSpecs(
  ...specs: HparamAndMetricSpec[]
): HparamAndMetricSpec {
  const hparams = new Map<string, HparamSpec>();
  const hparamDisplayNames = new Map<string, Set<string>>();
  const metrics = new Map<string, MetricSpec>();
  const metricDisplayNames = new Map<string, Set<string>>();
  const validationError: string[] = [];

  for (const spec of specs) {
    for (const hparamSpec of spec.hparams) {
      if (!hparamDisplayNames.has(hparamSpec.name)) {
        hparamDisplayNames.set(hparamSpec.name, new Set());
      }
      hparamDisplayNames.get(hparamSpec.name)!.add(hparamSpec.displayName);
      if (!hparams.has(hparamSpec.name)) {
        hparams.set(hparamSpec.name, {...hparamSpec});
      } else {
        const specA = hparams.get(hparamSpec.name)!;
        const specB = hparamSpec;
        if (specA.type !== specB.type) {
          validationError.push(
            `Hparam, ${specB.name}, types have to match. Got: ` +
              `${specA.type} vs. ${specB.type}`
          );
        }

        if (
          specA.domain.type === DomainType.INTERVAL &&
          specB.domain.type === DomainType.INTERVAL
        ) {
          if (
            specA.domain.minValue !== specB.domain.minValue ||
            specA.domain.maxValue !== specB.domain.maxValue
          ) {
            validationError.push(
              `Hparam, ${specB.name}, domains have to match. ` +
                `Got: ${specA.domain} vs. ${specB.domain}`
            );
          }
        } else if (
          specA.domain.type === DomainType.DISCRETE &&
          specB.domain.type === DomainType.DISCRETE
        ) {
          const valueSet = new Set([
            ...specA.domain.values,
            ...specB.domain.values,
          ]);
          if (
            specA.domain.values.length !== specB.domain.values.length ||
            specA.domain.values.length !== valueSet.size
          ) {
            validationError.push(
              `Hparam, ${specB.name}, domains have to match. ` +
                `Got: ${specA.domain} vs. ${specB.domain}`
            );
          }
        } else {
          validationError.push(
            `Hparam, ${specB.name}, domains have to match. ` +
              `Got: ${specA.domain} vs. ${specB.domain}`
          );
        }
      }
    }

    for (const metricSpec of spec.metrics) {
      if (!metricDisplayNames.has(metricSpec.tag)) {
        metricDisplayNames.set(metricSpec.tag, new Set());
      }
      metricDisplayNames.get(metricSpec.tag)!.add(metricSpec.displayName);
      if (!metrics.has(metricSpec.tag)) {
        metrics.set(metricSpec.tag, {...metricSpec});
      } else {
        const specA = metrics.get(metricSpec.tag)!;
        const specB = metricSpec;
        if (specA.datasetType !== specB.datasetType) {
          validationError.push(
            `Metric, ${specB.tag}, datasetTypes have to match. Got: ` +
              `${specA.datasetType} vs. ${specB.datasetType}`
          );
        }
      }
    }
  }

  if (validationError.length) {
    // TODO(b/157733179): handle the error gracefully on the view side.
    throw new Error(`Validation error:
${validationError.join('\n')}`);
  }

  return {
    hparams: [...hparams].map(([hparamName, spec]) => {
      return {
        ...spec,
        displayName: [...hparamDisplayNames.get(hparamName)!].join(' or '),
      };
    }),
    metrics: [...metrics].map(([metricTag, spec]) => {
      return {
        ...spec,
        displayName: [...metricDisplayNames.get(metricTag)!].join(' or '),
      };
    }),
  };
}
