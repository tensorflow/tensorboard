/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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

// TODO(@andycoenen): Figure out a way to properly import the .d.ts file 
// generated in the umap-js build into the tensorboard build system
// https://raw.githubusercontent.com/PAIR-code/umap-js/1.0.3/lib/umap-js.d.ts

type DistanceFn = (x: Vector, y: Vector) => number;
type EpochCallback = (epoch: number) => boolean | void;
type Vector = number[];
type Vectors = Vector[];
interface UMAPParameters {
    nComponents?: number;
    nEpochs?: number;
    nNeighbors?: number;
    random?: () => number;
}
interface UMAP {
    new(params?: UMAPParameters): UMAP;
    fit(X: Vectors): number[][];
    fitAsync(X: Vectors, callback?: (epochNumber: number) => void | boolean): Promise<number[][]>;
    initializeFit(X: Vectors): number;
    setPrecomputedKNN(knnIndices: number[][], knnDistances: number[][]): void;
    step(): number;
    getEmbedding(): number[][];
}

declare let UMAP: UMAP;
