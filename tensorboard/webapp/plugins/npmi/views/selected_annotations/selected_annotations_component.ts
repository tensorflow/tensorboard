import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';

@Component({
  selector: 'selected-annotations-component',
  templateUrl: './selected_annotations_component.ng.html',
  styleUrls: ['./selected_annotations_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedAnnotationsComponent {
  @Input() pcExpanded!: boolean;
  @Input() selectedAnnotations!: string[];
  @Output() onClearSelectedAnnotations = new EventEmitter();
  @Output() onToggleExpanded = new EventEmitter();
}
