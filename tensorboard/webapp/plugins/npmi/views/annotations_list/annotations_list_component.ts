import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';

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
  @Output() onToggleExpanded = new EventEmitter();
}
