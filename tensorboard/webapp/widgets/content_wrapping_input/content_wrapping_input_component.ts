/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

interface FontFaceSet {
  addEventListener(event: string, calback: (event: Event) => void): void;
  removeEventListener(event: string, calback: (event: Event) => void): void;
}

// See https://developer.mozilla.org/en-US/docs/Web/API/Document/fonts
declare global {
  interface Document {
    fonts?: FontFaceSet;
  }
}

/**
 * An input that tightly wraps a value.
 *
 * Native HTML `<input>` has a fixed width and lets the content scroll within
 * the element. Instead of that, this component resizes the element dynamically
 * to match that of the `value`.
 *
 * Conditions in which we set the width are: (1) value change, (2) input event,
 * (3) font load changes. Even if font-family or CSS values change, this module
 * will not respond to those.
 */
@Component({
  standalone: false,
  selector: 'content-wrapping-input',
  template: `
    <span [class.container]="true" [class.is-valid]="isValid">
      <span #measurer class="measurer" aria-hidden="true">{{
        internalValue || placeholder
      }}</span>
      <input
        #input
        autocomplete="off"
        spellcheck="false"
        type="text"
        (blur)="blur.emit($event)"
        (focus)="focus.emit($event)"
        (input)="onInput($event)"
        (keydown)="keydown.emit($event)"
        (keyup)="keyup.emit($event)"
        [value]="value"
        [placeholder]="placeholder"
      />
    </span>
  `,
  styleUrls: ['./content_wrapping_input_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentWrappingInputComponent
  implements OnInit, OnDestroy, AfterViewChecked, OnChanges
{
  @ViewChild('measurer', {static: true, read: ElementRef})
  private readonly measurerElRef!: ElementRef<HTMLSpanElement>;

  @ViewChild('input', {static: true, read: ElementRef})
  private readonly inputElRef!: ElementRef<HTMLInputElement>;

  @Input() value!: string;
  @Input() placeholder: string = '';

  @HostBinding('class')
  @Input()
  style: 'error' | 'high-contrast' | 'default' = 'default';

  /**
   * `value` validation regex pattern; similar to that of `input#pattern`. When
   * present and if invalid, it will visually put red border around the input.
   */
  @Input() pattern?: string;

  private patternRegex = new RegExp('.*');

  isValid: boolean = true;

  @Output() onValueChange = new EventEmitter<{value: string}>();
  @Output() blur = new EventEmitter<FocusEvent>();
  @Output() focus = new EventEmitter<FocusEvent>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();
  @Output() keyup = new EventEmitter<KeyboardEvent>();

  // Use internal state so we can update the DOM right away without waiting for
  // `value` to change by the owner of the component.
  internalValue: string = '';

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  private readonly fontChangeListener = this.updateInputWidth.bind(this);

  ngOnInit() {
    if (document.fonts) {
      // When font changes, we need to re-calculate the width of the `value`
      // rendered onto the measurer and re-set the width.
      // Without this, our screenshot tests become super flaky as Roboto fonts
      // are never cached under integration test environment and there could be
      // a timing issue where Roboto font gets loaded quite late.
      document.fonts.addEventListener('loadingdone', this.fontChangeListener);
    }
  }

  ngOnDestroy() {
    if (document.fonts) {
      document.fonts.removeEventListener(
        'loadingdone',
        this.fontChangeListener
      );
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['pattern']) {
      this.patternRegex = new RegExp(this.pattern ?? '');
    }

    if (changes['value']) {
      this.internalValue = this.value;
    }

    this.isValid = this.patternRegex.test(this.internalValue);
  }

  /**
   * Gets triggered when `@Input` changes or when event such as keydown happens
   * inside the component.
   */
  ngAfterViewChecked() {
    this.updateInputWidth();
  }

  onInput(event: InputEvent) {
    const prevValue = this.internalValue;
    this.internalValue = this.inputElRef.nativeElement.value;
    if (this.internalValue !== prevValue) {
      // In unit test, we can omit this but for reasons we do not yet
      // understand, below `changeDetector.markForCheck` does not trigge
      // `ngOnChanges` in real usage.
      this.isValid = this.patternRegex.test(this.internalValue);
      this.changeDetector.markForCheck();
    }

    this.onValueChange.emit({value: this.internalValue});
  }

  private updateInputWidth() {
    // WARN: this flow may cause forced reflow: write (by angular) -> read ->
    // write. Optimize if it causes performance issues.
    const {width} = this.measurerElRef.nativeElement.getBoundingClientRect();
    this.inputElRef.nativeElement.style.width = `${width}px`;
  }
}
