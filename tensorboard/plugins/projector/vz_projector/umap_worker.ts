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
namespace vz_projector {

   export interface UmapWorkerCreateMessage {
    type: 'UMAP_WORKER_CREATE';
    payload: { 
      nComponents: number; 
      nNeighbors: number;
    }
  }

  export interface UmapWorkerInitializeFitMessage {
    type: 'UMAP_WORKER_INTIALIZE_FIT';
    payload: { 
      X: number[][];
      knnIndices: number[][];
      knnDistances: number[][];
    };
  }

  export interface UmapWorkerStepOptimizeMessage {
    type: 'UMAP_WORKER_STEP_OPTIMIZE';
    payload?: {
      nSteps: number,
    }
  }

  export interface UmapWorkerGetEmbeddingMessage {
    type: 'UMAP_WORKER_GET_EMBEDDING';
  }

  export type UmapWorkerMessage = 
    UmapWorkerCreateMessage | 
    UmapWorkerInitializeFitMessage | 
    UmapWorkerStepOptimizeMessage |
    UmapWorkerGetEmbeddingMessage;

  export type UmapWorkerMessageEvent = {
    data: UmapWorkerMessage;
  }

  export interface UmapWorkerCreateResponse {
    type: 'UMAP_WORKER_CREATE';
  }

  export interface UmapWorkerInitializeFitResponse {
    type: 'UMAP_WORKER_INTIALIZE_FIT';
    payload: {
      nEpochs: number;
    }
  }

  export interface UmapWorkerStepOptimizeResponse {
    type: 'UMAP_WORKER_STEP_OPTIMIZE';
    payload: {
      currentEpoch: number;
    }
  }

  export interface UmapWorkerGetEmbeddingResponse {
    type: 'UMAP_WORKER_GET_EMBEDDING';
    payload: {
      embedding: number[][];
    }
  }

  export type UmapWorkerResponse = 
    UmapWorkerCreateResponse |
    UmapWorkerInitializeFitResponse |
    UmapWorkerStepOptimizeResponse |
    UmapWorkerGetEmbeddingResponse;

  export type UmapWorkerResponseEvent = {
    data: UmapWorkerResponse;
  }
  
  export function umapWorkerFunction() {
    this.window = this;

    // Since we're including the umap-js.min.js directly into the projector 
    // html page, we're going to string replace it into the worker function 
    // below
    /** UMAP_JS_SCRIPT_CODE */

    function respondError(messageId: number, error: Error) {
      // @ts-ignore
      return postMessage([messageId, null, error]);
    }

    function respondSuccess(messageId: number, response: UmapWorkerResponse) {
      // @ts-ignore
      return postMessage([messageId, response, null]);
    }
    
    this.onmessage = function(event: WorkerMessage<UmapWorkerMessage>) {
      const [messageId, message] = event.data;

      try {
        if (message.type === 'UMAP_WORKER_CREATE') {
          const { nComponents, nNeighbors } = message.payload
          this.umap = new UMAP({ nComponents, nNeighbors });
          return respondSuccess(messageId, { type: message.type });  
        }

        if (message.type === 'UMAP_WORKER_INTIALIZE_FIT') {
          const { X, knnIndices, knnDistances } = message.payload;
          const nEpochs = this.umap.initializeFit(X, knnIndices, knnDistances);
          return respondSuccess(messageId, { type: message.type, payload: { nEpochs } });  
        }

        if (message.type === 'UMAP_WORKER_STEP_OPTIMIZE') {
          let currentEpoch = 0;
          let nSteps = message.payload && message.payload.nSteps || 1;
          for (let i = 0; i < nSteps; i++) {
            currentEpoch = this.umap.step();
          }
          return respondSuccess(messageId, { type: message.type, payload: { currentEpoch } });  
        }

        if (message.type === 'UMAP_WORKER_GET_EMBEDDING') {
          const embedding = this.umap.getEmbedding();
          return respondSuccess(messageId, { type: message.type, payload: { embedding }});
        }

        respondError(messageId, new Error(`Unhandled message: ${message}`));
      } catch(error) {
        respondError(messageId, error)
      }
    }
  }
}  // namespace vz_projector
