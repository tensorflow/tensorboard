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
/* Utility functions used by tf-hparams-parallel-coords-plot element. */

import * as d3 from 'd3';
import * as _ from 'lodash';
import * as tf_hparams_utils from '../tf_hparams_utils/tf-hparams-utils';

// Finds the "closest" path to a given 'target' point from a given array
// of 'paths'.
// Each element in 'paths' represents a path and should be an object with
// a 'controlPoints' property containing a d-element array of the form
// [[x1,y1],...,[x_d,y_d]] containing the path's control points
// in ascending 'x' coordinate order, where d is the number of axes.
// 'axesPos' should be a d-element array containng the x coordinate of
// each axis.
// 'target' should be a 2-d array of the form [x, y] defining the target
// point.
// 'threshold' denotes a threshold where if the closest path has distance
// (see below) of more than 'threshold', the return value is null.
//
// We define "Closest path" with respect to the following definition of
// distance. The distance from a point 'target' to a path 'p' is
// the minimum Euclidean distance from 'target' to a point in the
// straight-line segment connecting the two control points of 'p'
// "associated" with 'target'. The control points associated with target
// are those corresponding to the 2 axes closest (under the usual
// Euclidean meaning) to 'target' (ties are broken by preferring axes
// with smaller coordinates).
//
// The return value of this method is a closest member of 'paths' to
// 'target' if the closest distance is at most 'threshold' or null
// otherwise.
export function findClosestPath(paths, axesPos, target, threshold) {
  if (axesPos.length < 2) {
    console.error('Less than two axes in parallel coordinates plot.');
    return null;
  }
  const cx = target[0];
  const cy = target[1];
  if (cx <= axesPos[0] || cx >= axesPos[axesPos.length - 1]) {
    return null;
  }
  // Find the indices a, b of the two axes closest to 'target'.
  const b = _.sortedIndex(axesPos, cx);
  console.assert(b > 0);
  console.assert(b < axesPos.length);
  const a = b - 1;
  // Computes the square of the minimum Euclidean distance from
  // (cx, cy) to a point on the line segment connecting
  // (ax,ay) and (bx,by).
  //
  // Method: Let A=(ax,ay), B=(bx,by) and C=(cx, cy):
  // A parametric from of the line passing through A and B is:
  // B+t(A-B); t real.
  // The line segment is the part with 0<=t<=1.
  // Let 'tp' be the 't' corresponding to the projection of C onto the
  // line. Clearly, 'tp' satisfies:
  // <C-(B+tp(A-B)),A-B> = 0, where <> denotes the dot product. Solving
  // for tp, one gets: tp = <A-B,C-B> / <A-B,A-B>.
  // Since the point on the line segment closest to C is the point on
  // the segment closest to the projection of C onto the line, we get:
  // if tp<=0, the closest point on the line segment is B.
  // if tp>=1, the closest point on the segment is A.
  // Otherwise, the closest point is B+tp(A-B).
  function distFn(ax, ay, bx, by) {
    const abx = ax - bx;
    const aby = ay - by;
    const cbx = cx - bx;
    const cby = cy - by;
    const tp = (abx * cbx + aby * cby) / (abx * abx + aby * aby);
    if (tp <= 0) {
      return tf_hparams_utils.l2NormSquared(cbx, cby);
    }
    if (tp >= 1) {
      const cax = ax - cx;
      const cay = ay - cy;
      return tf_hparams_utils.l2NormSquared(cax, cay);
    }
    return tf_hparams_utils.l2NormSquared(cbx - tp * abx, cby - tp * aby);
  }
  let minDist: number | null = null;
  let closestPath = null;
  paths.forEach((p) => {
    const dist = distFn(
      p.controlPoints[a][0],
      p.controlPoints[a][1],
      p.controlPoints[b][0],
      p.controlPoints[b][1]
    );
    if (dist > threshold) {
      return;
    }
    if (minDist === null || dist < minDist) {
      minDist = dist;
      closestPath = p;
    }
  });
  return closestPath;
}

// Computes the inverse image (in the mathematical sense) of the
// real-line interval [a,b] under the given point scale mapping.
// Returns the array consisting of all elements x such that scale(x)
// is in the real-line interval [a,b].
export function pointScaleInverseImage(scale, a, b) {
  return scale.domain().filter((x) => {
    const y = scale(x);
    return a <= y && y <= b;
  });
}

// Computes the inverse image (in the mathematical sense) of the
// real-line interval [a,b] under the given quantile scale mapping;
// precisely: {x : scale(x) in [a,b]}
// Note that for a D3 quantile scale this set is a real-line half-open
// interval of the form [c,d).
// This function returns that interval as a 2-element array [c, d].
export function quantileScaleInverseImage(scale, a, b) {
  const range = scale.range();
  const domains = range
    .filter((y) => a <= y && y <= b)
    .map((y) => {
      const domain = scale.invertExtent(y);
      // Find the half open interval of real numbers mapping to y.
      // This is typically returned by scale.invertExtent(y).
      // However, if 'y' is the last value in the range, that
      // interval has the form [d,+infinity), whereas the upper
      // bound returned by scale.invertExtent is the largest element
      // in scale.domain(). Since we return a half-open interval, if
      // we use that value, we will drop session groups whose
      // column value exactly equals it. So we test for this special
      // case here and adjust domain[1] to compensate.
      return y === range[range.length - 1]
        ? [domain[0], domain[1] + 1]
        : domain;
    });
  if (domains.length == 0) {
    return [0, 0]; // Return an empty interval [0,0).
  }
  // Since our source set is a contiguous interval [a,b], the union of
  // domains is a single half-open interval.
  return d3.extent(d3.merge(domains));
}

// Computes the inverse image (in the mathematical sense) of the
// real-line interval [a,b] under the given continuous scale mapping;
// precisely: {x : scale(x) in [a,b]}
// Note that for a D3 continuous scale this set is a real-line closed
// interval. This function returns that interval as a 2-element array.
export function continuousScaleInverseImage(scale, a, b) {
  // D3 continuous scales are monotonic continuous functions; hence to
  // get the inverse image interval we just need to invert the
  // end-points of the source interval. We sort the resulting end-points,
  // to handle the case where the scale is decreasing.
  return [scale.invert(a), scale.invert(b)].sort((x, y) => x - y);
}

// Creates the d3-scale to use for the axis with given domain values
// and height and scale-type. This function may permute the given
// 'domainValues' array.
export function createAxisScale(domainValues, axisHeight, scaleType) {
  function computeNumericExtent() {
    if (domainValues.length === 0) {
      // If there are no values, there won't be any session groups.
      // We choose an arbitrary numeric domain that doesn't contain 0
      // (to allow a log scale).
      return [1, 2];
    }
    const [min, max] = d3.extent(domainValues) as [unknown, unknown] as [
      number,
      number
    ];
    if (min !== max) {
      return [min, max];
    }
    // We shift the min and max of the extent here since
    // d3.scaleLinear() and d3.scaleLog() both expect the domain
    // to be an interval with more than one point. Since in this case
    // all session groups would pass through a single point in the axis,
    // the axis resolution doesn't matter much so the amount we shift by
    // doesn't matter much as well. Since for log scales we don't allow
    // the domain to contain 0, we need to be careful not to make the
    // domain contain 0 if it hadn't before.
    if (min > 0) {
      return [min * 0.5, min * 1.5];
    }
    if (min < 0) {
      return [min * 1.5, min * 0.5];
    }
    return [-1, 1];
  }
  if (scaleType === 'LINEAR') {
    return d3
      .scaleLinear()
      .domain(computeNumericExtent() as any)
      .range([axisHeight, 0]);
  } else if (scaleType === 'LOG') {
    const extent = computeNumericExtent();
    if (extent[0] <= 0 && extent[1] >= 0) {
      // We can't have a log scale for data whose extent contains 0.
      // Use a linear scale instead.
      // TODO(erez): Create a symlog scale similar to Matplotlib's
      // symlog. See also d3 issue here:
      // https://github.com/d3/d3-scale/issues/105
      // and b/111755540
      return createAxisScale(domainValues, axisHeight, 'LINEAR');
    }
    return d3
      .scaleLog()
      .domain(extent as any)
      .range([axisHeight, 0]);
  } else if (scaleType === 'QUANTILE') {
    // Compute kNumQuantiles quantiles.
    const kNumQuantiles = 20;
    // Compute the scale's range to be the array:
    // [axisHeight,
    //  axisHeight-1*axisHeight/(kNumQuantiles-1),
    //  axisHeight-2*axisHeight/(kNumQuantiles-1), ...,
    //  0].
    // Unfortunatley,
    // d3.range(axisHeight, -axisHeight/(kNumQuantiles-1),
    //          -axisHeight/(kNumQuantiles-1))
    // has numerical issues and may produce an extra member, so we use a
    // different procedure:
    const scaleRange = d3
      .range(kNumQuantiles)
      .map((i) => axisHeight - (i * axisHeight) / (kNumQuantiles - 1));
    if (domainValues.length === 0) {
      // No session groups in this case. We use a dummy value since
      // d3.scaleQuantile() requires a non-empty domain.
      domainValues = [1];
    }
    return d3.scaleQuantile().domain(_.uniq(domainValues)).range(scaleRange);
  } else if (scaleType === 'NON_NUMERIC') {
    return d3
      .scalePoint()
      .domain(
        // We sort the domain values to make the order
        // stable across 'ListSessionGroups' RPCs
        _.uniq(domainValues.sort())
      )
      .range([axisHeight, 0])
      .padding(0.1);
  } else throw RangeError('Unknown scale: ' + scaleType);
}
