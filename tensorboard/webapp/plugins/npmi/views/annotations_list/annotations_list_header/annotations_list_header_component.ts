import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {stripMetricString, addSortingSymbol} from '../../../util/metric_type';
import {
  AnnotationSorting,
  SortingOrder,
  AnnotationDataListing,
} from '../../../store/npmi_types';
import * as npmiActions from '../../../actions';

@Component({
  selector: 'npmi-annotations-list-header-component',
  templateUrl: './annotations_list_header_component.ng.html',
  styleUrls: ['./annotations_list_header_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListHeaderComponent {
  @Input() annotations!: AnnotationDataListing;
  @Input() numAnnotations!: number;
  @Input() selectedAnnotations!: string[];
  @Input() activeMetrics!: string[];
  @Input() sorting!: AnnotationSorting;

  constructor(private store: Store<any>) {}

  stripAndAppendMetric(metric: string): string {
    return stripMetricString(addSortingSymbol(metric, this.sorting));
  }

  sortChange(metric: string) {
    let newSorting = {
      metric: metric,
      order: SortingOrder.DOWN,
    };
    if (this.sorting.metric === metric) {
      if (this.sorting.order === SortingOrder.DOWN) {
        newSorting.order = SortingOrder.UP;
      }
    }
    this.store.dispatch(
      npmiActions.npmiChangeAnnotationSorting({sorting: newSorting})
    );
  }

  allAnnotationsToggled(checked: boolean) {
    if (checked) {
      this.store.dispatch(
        npmiActions.npmiSetSelectedAnnotations({
          annotations: Object.keys(this.annotations),
        })
      );
    } else {
      this.store.dispatch(
        npmiActions.npmiSetSelectedAnnotations({annotations: []})
      );
    }
  }
}
