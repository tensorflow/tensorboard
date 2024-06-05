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
/*
 * Common utilities used in the hparams plugin.
 */
import * as d3 from 'd3';
import * as _ from 'lodash';

// -----------------------------------------------------------------------
// Functions for dealing with HParams, Metrics, Columns,
// SessionGroups and Schema objects.
// In the following routines we use the following naming conventions for
// parameters:
//
// hparamInfo, metricInfo: A JavaScript object representation of the
//     HParamInfo proto defined in api.proto.
// schema: The object storing metadata on the metrics and hparams used
//     in the experiment. See the documentation in
//     'tf-hparams-query-pane.html'.
// visibleSchema: The object storing metadata on just the visible metrics
//     and hparams in 'schema'. This is the object stored in the property
//     'visibleSchema' of 'configuration' (see the documentation in
//     tf-hparams-query-pane.html' for more details). This object and the
//     utility functions below that accept it are deprecated and the
//     intention is to eventually remove them.
//     New code should instead filter the entries in the schema object
//     directly to find all the visible columns and only use the functions
//     below that take a 'schema' object.
// sessionGroup: A JavaScript object representation of the SessionGroup
//     proto defined in api.proto.
// sessionGroups: An array of 'sessionGroup' objects.
// columnIndex: An index of a 'column' of a sessionGroup with respect
//     to a schema or visibleSchema object. We regard a
//     sessionGroup as a row in a table where the columns represent
//     hparams and metric values for the session group. The columns are
//     ordered by listing the hparam columns first in the same order as
//     the corresponding elements of schema.hparamColumns or
//     visibleSchema.hparamInfos, followed by the
//     metric columns in the same order as the corresponding elements of
//     schema.metricColumns or visibleSchema.metricInfos. Whether the
//     index is given with respect to a schema or a visibleScheme depends
//     on the type of schema parameter the utility function below accepts
//     in addition to the columnIndex parameter.
// -----------------------------------------------------------------------
// Computes the name to display for the given 'hparamInfo' object.
export function hparamName(hparamInfo) {
  if (hparamInfo.displayName !== '' && hparamInfo.displayName !== undefined) {
    return hparamInfo.displayName;
  }
  return hparamInfo.name;
}

// Computes the name to display for the given metricInfo object.
export function metricName(metricInfo) {
  if (metricInfo.displayName !== '' && metricInfo.displayName !== undefined) {
    return metricInfo.displayName;
  }
  let group = metricInfo.name.group;
  let tag = metricInfo.name.tag;
  if (group === undefined) {
    group = '';
  }
  if (tag === undefined) {
    tag = '';
  }
  if (group === '' || group === '.') {
    return tag;
  }
  return group + '.' + tag;
}

export function schemaColumnName(schema, columnIndex) {
  if (columnIndex < schema.hparamColumns.length) {
    return hparamName(schema.hparamColumns[columnIndex].hparamInfo);
  }
  const metricIndex = columnIndex - schema.hparamColumns.length;
  return metricName(schema.metricColumns[metricIndex].metricInfo);
}

// Returns the number of hparams in schema (visible and invisible).
export function numHParams(schema) {
  return schema.hparamColumns.length;
}

// Returns the number of metrics in schema (visible and invisible).
export function numMetrics(schema) {
  return schema.metricColumns.length;
}

// Returns the number of columns in schema (visible and invisible).
export function numColumns(schema) {
  return numHParams(schema) + numMetrics(schema);
}

// Returns hparamValues[hparamName]. To be used in a Polymer databinding
// annotation (as Polymer doesn't have an annotation for looking up a
// property in an JS object).
export function hparamValueByName(hparamValues, hparamName) {
  return hparamValues[hparamName];
}

// Given an array 'metricValues' of (javascript object representation) of
// tensorboard.hparams.MetricValue's protocol buffers, returns the first
// element whose metric name is 'metricName' or undefined if no such
// element exists.
export function metricValueByName(metricValues, metricName) {
  return metricValues.find((mv) => _.isEqual(mv.name, metricName));
}

// Returns sessionGroup's metric value of the metric with index
// 'metricIndex' in schema.metricColumns.
export function hparamValueByIndex(schema, sessionGroup, hparamIndex) {
  return sessionGroup.hparams[
    schema.hparamColumns[hparamIndex].hparamInfo.name
  ];
}

// Returns sessionGroup's metric value of the metric with index
// 'metricIndex' in schema.metricColumns.
export function metricValueByIndex(schema, sessionGroup, metricIndex) {
  const metricName = schema.metricColumns[metricIndex].metricInfo.name;
  const metricValue = metricValueByName(sessionGroup.metricValues, metricName);
  return metricValue === undefined || metricValue.value === 'NaN'
    ? undefined
    : metricValue.value;
}

// Returns sessionGroup's column value of the column with index
// 'columnIndex' in schema.
export function columnValueByIndex(schema, sessionGroup, columnIndex) {
  if (columnIndex < schema.hparamColumns.length) {
    return hparamValueByIndex(schema, sessionGroup, columnIndex);
  }
  return metricValueByIndex(
    schema,
    sessionGroup,
    columnIndex - schema.hparamColumns.length
  );
}

// Returns an array [min, max] representing the minimum and maximum
// value of the given column in the sessionGroups array.
// Ignores session groups with missing values for the column.
export function numericColumnExtent(schema, sessionGroups, columnIndex) {
  return d3.extent(sessionGroups, (sg) =>
    columnValueByIndex(schema, sg, columnIndex)
  );
}

// Converts a visibleSchema columnIndex to a schema columnIndex.
// Returns the schema-relative columnIndex for the visible column with
// visibleSchema-releative columnIndex given by 'visibleColumnIndex'.
export function getAbsoluteColumnIndex(
  schema,
  visibleSchema,
  visibleColumnIndex
) {
  let result;
  if (visibleColumnIndex < visibleSchema.hparamInfos.length) {
    result = schema.hparamColumns.findIndex(
      (c) =>
        c.hparamInfo.name === visibleSchema.hparamInfos[visibleColumnIndex].name
    );
  } else {
    const metricIndex = visibleColumnIndex - visibleSchema.hparamInfos.length;
    const metricName = visibleSchema.metricInfos[metricIndex].name;
    result =
      schema.hparamColumns.length +
      schema.metricColumns.findIndex((c) => c.metricInfo.name === metricName);
  }
  console.assert(result !== -1);
  return result;
}

// DEPRECATED. Use schemaColumnName instead (with an "absolute"
// columnIndex).
// Computes the name to display for the given visible column index.
export function schemaVisibleColumnName(visibleSchema, columnIndex) {
  if (columnIndex < visibleSchema.hparamInfos.length) {
    return hparamName(visibleSchema.hparamInfos[columnIndex]);
  }
  const metricIndex = columnIndex - visibleSchema.hparamInfos.length;
  return metricName(visibleSchema.metricInfos[metricIndex]);
}

// DEPRECATED. Use numDisplayedHParams instead.
// Returns the number of hparams in visibleSchema. This is the same
// value as numDisplayedHParams(schema) with schema being the "containing"
// schema of visibleSchema.
export function numVisibleHParams(visibleSchema) {
  return visibleSchema.hparamInfos.length;
}

// DEPRECATED. Use numDisplayedMetrics instead.
// Returns the number of hparams in visibleSchema. This is the same
// value as numDisplayedMetrics(schema) with schema being the "containing"
// schema of visibleSchema.
export function numVisibleMetrics(visibleSchema) {
  return visibleSchema.metricInfos.length;
}

// DEPRECATED.
// Returns the number of visible columns (having 'displayed' true).
// This is the same value as numDisplayedColumns(schema) with schema
// being the "containing" schema of visibleSchema.
export function numVisibleColumns(visibleSchema) {
  return numVisibleHParams(visibleSchema) + numVisibleMetrics(visibleSchema);
}

// DEPRECATED. Use numericColumnExtent with a schema columnIndex instead.
// Returns an array [min, max] representing the minimum and maximum
// value of the given visible column in the sessionGroups array.
// Ignores session groups with missing values for the column.
export function visibleNumericColumnExtent(
  visibleSchema,
  sessionGroups,
  columnIndex
) {
  return d3.extent(sessionGroups, (sg) =>
    columnValueByVisibleIndex(visibleSchema, sg, columnIndex)
  );
}

// Returns a string representation of hparamValues[hparamName] suitable
// for display.
export function prettyPrintHParamValueByName(hparamValues, hparamName) {
  return prettyPrint(hparamValueByName(hparamValues, hparamName));
}

// Returns a string representation of metricValueByName suitable for
// display.
export function prettyPrintMetricValueByName(metricValues, metricName) {
  return prettyPrint(metricValueByName(metricValues, metricName));
}

// Returns the session group with name 'name' in sessionGroups or
// undefined of no such element exist.
export function sessionGroupWithName(sessionGroups, name) {
  return sessionGroups.find((sg) => sg.name === name);
}

// DEPRECATED. Use hparamValueByIndex with a schema hparamIndex instead.
// Returns sessionGroup's hparam value of the visible hparam with index
// 'hparamIndex' in visibleSchema.hparamInfos.
export function hparamValueByVisibleIndex(
  visibleSchema,
  sessionGroup,
  hparamIndex
) {
  return sessionGroup.hparams[visibleSchema.hparamInfos[hparamIndex].name];
}

// DEPRECATED. Use metricValueByIndex with a schema metricIndex instead.
// Returns sessionGroup's metric value of the visible metric with index
// 'metricIndex' in visibleSchema.metricInfos.
export function metricValueByVisibleIndex(
  visibleSchema,
  sessionGroup,
  visibleMetricIndex
) {
  const metricName = visibleSchema.metricInfos[visibleMetricIndex].name;
  const metricValue = metricValueByName(sessionGroup.metricValues, metricName);
  return metricValue === undefined || metricValue.value === 'NaN'
    ? undefined
    : metricValue.value;
}

// DEPRECATED. Use columnValueByIndex with a schema columnIndex instead.
// Returns sessionGroup's column value of the visible column with index
// 'columnIndex' in visibleSchema.
export function columnValueByVisibleIndex(
  visibleSchema,
  sessionGroup,
  columnIndex
) {
  if (columnIndex < visibleSchema.hparamInfos.length) {
    return hparamValueByVisibleIndex(visibleSchema, sessionGroup, columnIndex);
  }
  return metricValueByVisibleIndex(
    visibleSchema,
    sessionGroup,
    columnIndex - visibleSchema.hparamInfos.length
  );
}

// ---- Misc functions ---------------------------------------------------
// Returns a string representation of 'value' suitable for display.
export function prettyPrint(value) {
  if (_.isNumber(value)) {
    // TODO(erez):Make the precision user-configurable.
    return value.toPrecision(5);
  }
  if (value === null || value === undefined) {
    return '';
  }
  return value.toString();
}

// Returns the square of the L2-norm of (x, y).
export function l2NormSquared(x, y) {
  return x * x + y * y;
}

// Returns the euclidean distance between (x0, y0) and (x1, y1).
export function euclideanDist(x0, y0, x1, y1) {
  return Math.sqrt(l2NormSquared(x0 - x1, y0 - y1));
}

// Returns the (euclidean) distance between the point (x, y) and the
// rectangle [x0, x1) x [y0, y1).
export function pointToRectangleDist(x, y, x0, y0, x1, y1) {
  if (x < x0 && y < y0) {
    return euclideanDist(x, y, x0, y0);
  } else if (x0 <= x && x < x1 && y < y0) {
    return y0 - y;
  } else if (x1 <= x && y < y0) {
    return euclideanDist(x, y, x1, y0);
  } else if (x < x0 && y0 <= y && y < y1) {
    return x0 - x;
  } else if (x0 <= x && x < x1 && y0 <= y && y < y1) {
    return 0;
  } else if (x1 <= x && y0 <= y && y < y1) {
    return x - x1;
  } else if (x < x0 && y1 <= y) {
    return euclideanDist(x, y, x0, y1);
  } else if (x0 <= x && x < x1 && y1 <= y) {
    return y - y1;
  } else if (x1 <= x && y1 <= y) {
    return euclideanDist(x, y, x1, y1);
  } else {
    throw 'Point (x,y) must be in one of the regions defined above.';
  }
}

// SVG elements such as <g> can optionally have a "transform" attribute
// the alters the way the element and its children are drawn.
// The following function helps generate a "translate function" value
// for this attribute.
// See
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
// for more details.
export function translateStr(x, opt_y?: any) {
  if (opt_y === undefined) {
    return 'translate(' + x + ')';
  }
  return 'translate(' + x + ',' + opt_y + ')';
}

// SVG elements such as <g> can optionally have a "transform" attribute
// the alters the way the element and its children are drawn.
// The following function helps generate a "rotate function" value
// for this attribute.
// See
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
// for more details.
export function rotateStr(angle, x, y) {
  let result = 'rotate(' + angle;
  if (x !== undefined && y !== undefined) {
    result = result + ',' + x + ',' + y;
  }
  result = result + ')';
  return result;
}

export function isNullOrUndefined(x) {
  return x === null || x === undefined;
}

// Given a d3.quadTree object, visits all the points in it
// that lie inside the rectangle [x0, x1) x [y0, y1).
// For each such point calls the given callback, passing the
// point's quadtree data.
export function quadTreeVisitPointsInRect(quadTree, x0, y0, x1, y1, callback) {
  quadTree.visit((node, nx0, ny0, nx1, ny1) => {
    // Represents the set of points [nx0, nx1) x [ny0, ny1).
    if (node.length === undefined) {
      do {
        const x = quadTree.x()(node.data);
        const y = quadTree.y()(node.data);
        if (x0 <= x && x < x1 && y0 <= y && y < y1) {
          callback(node.data);
        }
      } while ((node = node.next));
      return true;
    }
    // Skip this node if Intersection([nx0, nx1) x [ny0, ny1),
    //  [x0, x1) x [y0, y1)) is empty, or equivalently, if
    // either Intersection([nx0, nx1), [x0, x1)) or
    // Intersection([ny0, ny1), [y0, y1)) is empty.
    return nx0 >= x1 || nx1 <= x0 || ny0 >= y1 || ny1 <= y0;
  });
}

// Given a d3.quadTree object, visits all the points in it
// that lie inside the closed disk centered at (centerX, centerY)
// with the given radius.
// For each such point calls the given callback, passing the
// point's quadtree data and the distance from the point to the center
// of the disk.
export function quadTreeVisitPointsInDisk(
  quadTree,
  centerX,
  centerY,
  radius,
  callback
) {
  quadTree.visit((node, x0, y0, x1, y1) => {
    // Represents the set of points [x0, x1) x [y0, y1).
    if (node.length === undefined) {
      do {
        const x = quadTree.x()(node.data);
        const y = quadTree.y()(node.data);
        const centerDist = euclideanDist(centerX, centerY, x, y);
        if (centerDist <= radius) {
          callback(node.data, centerDist);
        }
      } while ((node = node.next));
      return true;
    }
    // Skip nodes that represent a rectangle that does not intersect the
    // disk. Equivalently, skip nodes that represent a rectangle whose
    // distance to (centerX, centerY) is larger than radius.
    return pointToRectangleDist(centerX, centerY, x0, y0, x1, y1) > radius;
  });
}

// Returns a Set consisting of all elements in 'set' for which
// predicateFn evaluates to a truthy value.
export function filterSet(set, predicateFn) {
  const result = new Set();
  set.forEach((val) => {
    if (predicateFn(val)) {
      result.add(val);
    }
  });
  return result;
}

// Sets the array property of polymerElement to 'newArray' in
// a Polymer-"observable" manner, so that other elements that have
// the array as a property (like a dom-repeat) would update correctly.
// Args:
//   polymerElement: the polymer element whose array property we want
//                   to change.
//   pathToArray: a polymer dot-separated path string to the array
//   newArray: the new array to set.
export function setArrayObservably(polymerElement, pathToArray, newArray) {
  const currentArray = polymerElement.get(pathToArray, polymerElement);
  // If the current value is not an array, then we use
  // 'polymerElement.set' to replace it with newArray.
  if (!Array.isArray(currentArray)) {
    polymerElement.set(pathToArray, newArray);
    return;
  }
  // Call Polymer.Base.splice() removing the old elements and inserting
  // the new ones.
  // We need to call polymerElement.splice with 'apply' since splice
  // receives a variable argument-list and we want to pass it an array
  // (newArray).
  polymerElement.splice.apply(
    polymerElement,
    [pathToArray, 0, currentArray.length].concat(newArray)
  );
}

// Computes a simple not-secure 32-bit integer hash value for a string.
export function hashOfString(str) {
  let result = 0;
  for (let i = 0; i < str.length; ++i) {
    result = (result * 31 + str.charCodeAt(i)) & 4294967295;
  }
  // Bitwise operations in JavaScript convert operands to 32-bit 2's
  // complement representation in the range [-2**31,(2**31)-1]. Shift it
  // to the range [0, (2**32)-1].
  return result + 2 ** 31;
}
