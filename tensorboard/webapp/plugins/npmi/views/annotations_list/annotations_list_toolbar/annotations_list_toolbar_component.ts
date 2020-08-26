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

@Component({
  selector: 'npmi-annotations-list-toolbar-component',
  templateUrl: './annotations_list_toolbar_component.ng.html',
  styleUrls: ['./annotations_list_toolbar_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListToolbarComponent {
  @Input() numAnnotations!: number;
  @Input() expanded!: boolean;
  @Input() selectedAnnotations!: string[];
  @Input() annotationsExpanded!: boolean;
  @Input() showCounts!: boolean;
  @Input() showHidden!: boolean;
  @Input() regexFilterValue!: string;
  @Input() isRegexFilterValid!: boolean;
  @Output() onRegexFilterValueChange = new EventEmitter<string>();
  @Output() onFlagAnnotations = new EventEmitter<string[]>();
  @Output() onHideAnnotations = new EventEmitter<string[]>();
  @Output() onToggleExpanded = new EventEmitter();
  @Output() onToggleShowCounts = new EventEmitter();
  @Output() onToggleShowHidden = new EventEmitter();
  @ViewChild(MatAutocompleteTrigger, {static: true})
  autocompleteTrigger!: MatAutocompleteTrigger;

  constructor(private store: Store<any>) {}
}
