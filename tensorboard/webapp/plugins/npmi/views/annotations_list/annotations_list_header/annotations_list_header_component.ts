import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import {stripMetricString, addSortingSymbol} from '../../../util/metric_type';
import {AnnotationSorting, SortingOrder} from '../../../store/npmi_types';

@Component({
  selector: 'npmi-annotations-list-header-component',
  templateUrl: './annotations_list_header_component.ng.html',
  styleUrls: ['./annotations_list_header_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListHeaderComponent {
  @Input() numAnnotations!: number;
  @Input() selectedAnnotations!: string[];
  @Input() activeMetrics!: string[];
  @Input() sorting!: AnnotationSorting;
  @Output() onChangeSorting = new EventEmitter<{
    newMetric: string;
    oldSorting: {metric: string; order: SortingOrder};
  }>();
  @Output() onAllAnnotationsToggled = new EventEmitter<boolean>();

  stripAndAppendMetric(metric: string): string {
    return stripMetricString(addSortingSymbol(metric, this.sorting));
  }
}
