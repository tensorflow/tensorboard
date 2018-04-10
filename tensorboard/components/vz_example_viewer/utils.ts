/**
 * @fileoverview Utilites for example viewer.
 */

goog.require('goog.crypt.base64');
goog.require('proto.tensorflow.Example');
goog.require('proto.tensorflow.Feature');

namespace vz_example_viewer {

/** JSON interface for vz-annotated-image visualization. */
export declare interface ImageRenderedAnnotation {
  annotationGroup: AnnotationGroup[];
  image: ImageAsset;
}

export declare interface AnnotationGroup {
  annotation: Annotation[];
  source: string;
}

export declare interface Annotation {
  annotationScope?: AnnotationScope;
  displayName: string;
}

export declare interface AnnotationScope {
  label: string;
  point: Point[];
}

export declare interface Point {
  x: number;
  y: number;
}

export declare interface ImageAsset {
  imageDataBase64: string;
  imageHeight: number;
  imageWidth: number;
}

/** Returns true if the example contains the 'image/encoded' feature. */
export function containsEncodedImageFeature(example: Example) {
  if (!example.getFeatures() || !example.getFeatures()!.getFeatureMap()) {
    return false;
  }
  const features = example.getFeatures()!.getFeatureMap();
  return !!features.get('image/encoded');
}

/** Returns true if the example encodes an annotated image. */
export function isAnnotatedImage(example: Example) {
  if (!containsEncodedImageFeature(example)) {
    return false;
  }
  // If the example has the 'image/object/class/text' feature, we consider it
  // an annotated image.
  return !!example.getFeatures()!.getFeatureMap().get(
      'image/object/class/text');
}

/**
 * Converts the example to an annotated image object, useable as input by the
 * vz-annotated-image visualization.
 */
export function exampleToAnnotatedImage(example: Example):
    ImageRenderedAnnotation|null {
  if (!containsEncodedImageFeature(example)) {
    return null;
  }

  // Helper functions, similar to helpers in learning/eval/canon/util/
  // conversion/tensorflow/convert_from_standard_tf_example.cc
  function getFeatureValues(feature: Feature): Array<string|number> {
    if (!feature) {
      return [];
    }
    // Since the tensorflow.Feature contains a oneof, check for existence of
    // bytesList, floatList, and int64List (in that order).
    // For multiple element value arrays, return the array as-is.
    if (feature.hasBytesList()) {
      return feature.getBytesList()!.getValueList();
    }
    if (feature.hasInt64List()) {
      return feature.getInt64List()!.getValueList();
    }
    if (feature.hasFloatList()) {
      return feature.getFloatList()!.getValueList();
    }
    return [];
  }

  function getSingleNumericValue(feature: Feature): number {
    return Number(getFeatureValues(feature)[0] as string);
  }

  function getSingleStringValue(feature: Feature): string {
    return getFeatureValues(feature)[0] as string;
  }

  const feats = example.getFeatures()!.getFeatureMap();
  const width = getSingleNumericValue(feats.get('image/width')!);
  const height = getSingleNumericValue(feats.get('image/height')!);

  const annotations: Annotation[] = [];
  const annotationGroup: AnnotationGroup[] =
      [{source: 'GROUNDTRUTH', annotation: annotations}];
  const imageAsset: ImageAsset = {
    imageWidth: width,
    imageHeight: height,
    imageDataBase64: 'data:image/jpeg;base64,' +
        btoa(decodeURIComponent(encodeURIComponent(valueToImageString(
            getSingleStringValue(feats.get('image/encoded')!))))),
  };
  const vizData: ImageRenderedAnnotation = {image: imageAsset, annotationGroup};

  const captions = getFeatureValues(feats.get('image/captions')!);
  for (const caption of captions) {
    annotations.push({displayName: valueToReadableString(caption as string)});
  }

  const classes = getFeatureValues(feats.get('image/object/class/text')!);
  for (let i = 0; i < classes.length; i++) {
    const displayName = valueToReadableString(classes[i] as string);
    const bBox = {
      xMin: getFeatureValues(feats.get('image/object/bbox/xmin')!)[i] as number,
      xMax: getFeatureValues(feats.get('image/object/bbox/xmax')!)[i] as number,
      yMin: getFeatureValues(feats.get('image/object/bbox/ymin')!)[i] as number,
      yMax: getFeatureValues(feats.get('image/object/bbox/ymax')!)[i] as number,
    };
    annotations.push({
      displayName,
      annotationScope: {
        label: displayName,
        point: [
          {x: bBox.xMin * width, y: bBox.yMin * height},
          {x: bBox.xMax * width, y: bBox.yMin * height},
          {x: bBox.xMax * width, y: bBox.yMax * height},
          {x: bBox.xMin * width, y: bBox.yMax * height}
        ]
      }
    });
  }
  return vizData;
}

/**
 * Decodes a list of bytes into a readable string, treating the bytes as
 * unicode char codes.
 */
export function decodeBytesListToString(bytes: Uint8Array) {
  // Decode strings in 16K chunks to avoid stack error with use of
  // fromCharCode.apply.
  const decodeChunkBytes = 16 * 1024;
  let res = '';
  let i = 0;
  // Decode in chunks to avoid stack error with use of fromCharCode.apply.
  for (i = 0; i < bytes.length / decodeChunkBytes; i++) {
    res += String.fromCharCode.apply(
        null, bytes.slice(i * decodeChunkBytes, (i + 1) * decodeChunkBytes));
  }
  res += String.fromCharCode.apply(null, bytes.slice(i * decodeChunkBytes));
  return res;
}

/** Converts a string feature value from an Example into an image string. */
function valueToImageString(value: string) {
  // tslint:disable-next-line:no-any Need to create Uint8Array from feature val.
  return decodeBytesListToString(new Uint8Array(value as any));
}

/** Converts a string feature value from an Example into a readable string. */
function valueToReadableString(value: string) {
  // tslint:disable-next-line:no-any Need to create Uint8Array from feature val.
  return goog.crypt.utf8ByteArrayToString(new Uint8Array(value as any));
}

}