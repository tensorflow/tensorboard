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
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  AnnotationDataListing,
  AnnotationSort,
  EmbeddingListing,
} from '../../store/npmi_types';

@Component({
  selector: 'annotations-list-component',
  templateUrl: './annotations_list_component.ng.html',
  styleUrls: ['./annotations_list_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListComponent {
  @Input() annotations!: AnnotationDataListing;
  @Input() embeddingData?: EmbeddingListing;
  @Input() annotationsExpanded!: boolean;
  @Input() numAnnotations!: number;
  @Input() annotationSort!: AnnotationSort;
  @Input() activeMetrics!: string[];
  @Input() numActiveRuns!: number;
  @Input() sortedAnnotations!: string[];
  @Input() selectedAnnotations!: string[];
  @Input() maxCount!: number;
  @Output() onRowClick = new EventEmitter<string[]>();
  readonly runHeight = 30;

  rowClicked(event: MouseEvent, annotation: string) {
    // Shift pressed, handle multiple annotations
    if (event.shiftKey) {
      let annotationIndex = this.sortedAnnotations.indexOf(annotation);
      if (this.selectedAnnotations.length === 0) {
        this.onRowClick.emit(
          this.sortedAnnotations.slice(0, annotationIndex + 1)
        );
      } else {
        let lastAnnotation =
          this.selectedAnnotations[this.selectedAnnotations.length - 1];
        const lastIndex = this.sortedAnnotations.indexOf(lastAnnotation);
        if (lastIndex < annotationIndex) {
          this.onRowClick.emit(
            this.sortedAnnotations.slice(lastIndex, annotationIndex + 1)
          );
        } else {
          this.onRowClick.emit(
            this.sortedAnnotations.slice(annotationIndex, lastIndex + 1)
          );
        }
      }
    } else {
      // No shift, only one annotation clicked
      this.onRowClick.emit([annotation]);
    }
  }
}
