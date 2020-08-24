import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';

import {MatAutocompleteTrigger} from '@angular/material/autocomplete';

import {Store} from '@ngrx/store';

import * as npmiActions from '../../../actions';

@Component({
  selector: 'npmi-annotations-list-toolbar-component',
  templateUrl: './annotations_list_toolbar_component.ng.html',
  styleUrls: ['./annotations_list_toolbar_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListToolbarComponent {
  @Input() numAnnotations!: number;
  @Input() selectedAnnotations!: string[];
  @Input() annotationsExpanded!: boolean;
  @Input() showCounts!: boolean;
  @Input() showHidden!: boolean;
  @Input() regexFilterValue!: string;
  @Input() isRegexFilterValid!: boolean;
  @Output() onRegexFilterValueChange = new EventEmitter<string>();
  @ViewChild(MatAutocompleteTrigger, {static: true})
  autocompleteTrigger!: MatAutocompleteTrigger;

  constructor(private store: Store<any>) {}

  flagAnnotations() {
    this.store.dispatch(
      npmiActions.npmiToggleAnnotationFlags({
        annotations: this.selectedAnnotations,
      })
    );
    this.store.dispatch(npmiActions.npmiClearSelectedAnnotations());
  }

  hideAnnotations() {
    this.store.dispatch(
      npmiActions.npmiToggleAnnotationsHidden({
        annotations: this.selectedAnnotations,
      })
    );
    this.store.dispatch(npmiActions.npmiClearSelectedAnnotations());
  }

  toggleExpanded() {
    this.store.dispatch(npmiActions.npmiToggleAnnotationsExpanded());
  }

  toggleShowCounts() {
    this.store.dispatch(npmiActions.npmiToggleShowCounts());
  }

  toggleShowHidden() {
    this.store.dispatch(npmiActions.npmiToggleShowHiddenAnnotations());
  }
}
