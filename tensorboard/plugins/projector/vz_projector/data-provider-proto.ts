/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
namespace vz_projector {

export class ProtoDataProvider implements DataProvider {
  private dataProto: DataProto;

  constructor(dataProto: DataProto) {
    this.dataProto = dataProto;
  }

  retrieveRuns(callback: (runs: string[]) => void): void {
    callback(['proto']);
  }

  retrieveProjectorConfig(run: string, callback: (d: ProjectorConfig) => void) {
    callback({
      modelCheckpointPath: 'proto',
      embeddings: [{
        tensorName: 'proto',
        tensorShape: this.dataProto.shape,
        metadataPath: 'proto'
      }]
    });
  }

  retrieveTensor(run: string, tensorName: string,
      callback: (ds: DataSet) => void) {
    callback(this.flatArrayToDataset(this.dataProto.tensor));
  }

  retrieveSpriteAndMetadata(run: string, tensorName: string,
      callback: (r: SpriteAndMetadataInfo) => void): void {
    let columnNames = this.dataProto.metadata.columns.map(c => c.name);
    let n = this.dataProto.shape[0];
    let pointsMetadata: PointMetadata[] = new Array(n);
    this.dataProto.metadata.columns.forEach(c => {
      let values = c.numericValues || c.stringValues;
      for (let i = 0; i < n; i++) {
        pointsMetadata[i] = pointsMetadata[i] || {};
        pointsMetadata[i][c.name] = values[i];
      }
    });
    let spritesPromise: Promise<HTMLImageElement> = Promise.resolve(null);
    if (this.dataProto.metadata.sprite != null) {
      spritesPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject('Failed converting base64 to an image');
        image.src = this.dataProto.metadata.sprite.imageBase64;
      });
    }
    spritesPromise.then(image => {
      const result: SpriteAndMetadataInfo = {
        stats: analyzeMetadata(columnNames, pointsMetadata),
        pointsInfo: pointsMetadata
      };
      if (image != null) {
        result.spriteImage = image;
        result.spriteMetadata = {
          singleImageDim: this.dataProto.metadata.sprite.singleImageDim,
          imagePath: 'proto'
        };
      }
      callback(result);
    });
  }

  getBookmarks(run: string, tensorName: string,
      callback: (r: State[]) => void): void {
    return callback([]);
  }

  private flatArrayToDataset(tensor: number[]): DataSet {
    let points: DataPoint[] = [];
    let n = this.dataProto.shape[0];
    let d = this.dataProto.shape[1];
    if (n * d !== tensor.length) {
      throw 'The shape doesn\'t match the length of the flattened array';
    }
    for (let i = 0; i < n; i++) {
      let offset = i * d;
      points.push({
        vector: new Float32Array(tensor.slice(offset, offset + d)),
        metadata: {},
        projections: null,
        index: i
      });
    }
    return new DataSet(points);
  }
}

}  // namespace vz_projector
