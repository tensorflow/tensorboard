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
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';

interface PolymerChangeEvent extends CustomEvent {
  detail: {value: any};
}

@Component({
  standalone: false,
  selector: 'tb-legacy-runs-selector-component',
  template: ` <tf-runs-selector #selector></tf-runs-selector> `,
})
export class LegacyRunsSelectorComponent implements AfterViewInit {
  @Output()
  onSelectionChange = new EventEmitter<string[]>();

  @ViewChild('selector', {static: true})
  private selector!: ElementRef;

  ngAfterViewInit() {
    /**
     * The event is dispatched by Polymer when `selectedRuns` prop changes because it
     * notifies (it is implicitly fired by Polymer library).
     */
    this.selector.nativeElement.addEventListener(
      'selected-runs-changed',
      (event: PolymerChangeEvent) => {
        this.onSelectionChange.emit(event.detail.value as string[]);
      }
    );
    setTimeout(() => {
      // Dispatch the initial value from the component.
      this.onSelectionChange.emit(this.selector.nativeElement.selectedRuns);
    });
  }
}
