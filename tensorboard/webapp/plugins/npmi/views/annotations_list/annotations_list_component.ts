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
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

import {AnnotationDataListing, AnnotationSorting} from '../../store/npmi_types';

@Component({
  selector: 'annotations-list-component',
  templateUrl: './annotations_list_component.ng.html',
  styleUrls: ['./annotations_list_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListComponent {
  @Input() annotations!: AnnotationDataListing;
  @Input() annotationsExpanded!: boolean;
  @Input() numAnnotations!: number;
  @Input() annotationSorting!: AnnotationSorting;
  @Input() activeMetrics!: string[];
}
