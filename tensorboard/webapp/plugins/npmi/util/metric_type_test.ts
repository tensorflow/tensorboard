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
  metricIsMetricCount,
  metricIsNpmi,
  metricIsNpmiAndNotDiff,
  stripMetricString,
} from './metric_type';

describe('metric type utils', () => {
  describe('metric is count', () => {
    it('returns true if the metric starts with count@', () => {
      const metric = 'count@test';
      expect(metricIsMetricCount(metric)).toBeTrue();
    });

    it('returns false if the metric does not start with count@', () => {
      const metric = 'nPMI@test';
      expect(metricIsMetricCount(metric)).toBeFalse();
    });

    it('returns false if the metric only contains count@', () => {
      const metric = 'foo@count@';
      expect(metricIsMetricCount(metric)).toBeFalse();
    });
  });

  describe('metric is npmi', () => {
    it('returns true if the metric starts with nPMI@', () => {
      const metric = 'nPMI@test';
      expect(metricIsNpmi(metric)).toBeTrue();
    });

    it('returns true if the metric starts with nPMI_diff@', () => {
      const metric = 'nPMI_diff@test';
      expect(metricIsNpmi(metric)).toBeTrue();
    });

    it('returns false if the metric does not start with nPMI', () => {
      const metric = 'count@test';
      expect(metricIsNpmi(metric)).toBeFalse();
    });

    it('returns false if the metric only contains nPMI@', () => {
      const metric = 'foo@nPMI@';
      expect(metricIsNpmi(metric)).toBeFalse();
    });

    it('returns false if the metric starts with npmi@', () => {
      const metric = 'npmi@test';
      expect(metricIsNpmi(metric)).toBeFalse();
    });

    it('returns false if the metric and prefix are not separated by @', () => {
      const metric = 'nPMItest';
      expect(metricIsNpmi(metric)).toBeFalse();
    });
  });

  describe('metric is npmi and not diff', () => {
    it('returns true if the metric starts with nPMI@', () => {
      const metric = 'nPMI@test';
      expect(metricIsNpmiAndNotDiff(metric)).toBeTrue();
    });

    it('returns false if the metric starts with nPMI_diff@', () => {
      const metric = 'nPMI_diff@test';
      expect(metricIsNpmiAndNotDiff(metric)).toBeFalse();
    });

    it('returns false if the metric only contains nPMI@', () => {
      const metric = 'foo@nPMI@';
      expect(metricIsNpmiAndNotDiff(metric)).toBeFalse();
    });
  });

  describe('strip metric string', () => {
    it('returns stripped metric for nPMI@', () => {
      const metric = 'nPMI@test';
      expect(stripMetricString(metric)).toBe('test');
    });

    it('returns stripped metric for nPMI_diff@', () => {
      const metric = 'nPMI_diff@test';
      expect(stripMetricString(metric)).toBe('test');
    });

    it('returns stripped metric for count@', () => {
      const metric = 'count@test';
      expect(stripMetricString(metric)).toBe('test');
    });
  });
});
