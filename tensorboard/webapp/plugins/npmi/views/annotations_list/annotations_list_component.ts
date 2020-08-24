import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

import {Store} from '@ngrx/store';

import {AnnotationDataListing, AnnotationSorting} from '../../store/npmi_types';
import * as npmiActions from '../../actions';

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

  constructor(private store: Store<any>) {}

  toggleExpanded() {
    this.store.dispatch(npmiActions.npmiToggleAnnotationsExpanded());
  }
}
