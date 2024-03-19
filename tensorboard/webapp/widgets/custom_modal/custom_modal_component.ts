/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
  Component,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  EmbeddedViewRef,
} from '@angular/core';
import {BehaviorSubject, filter} from 'rxjs';

export interface ModalContent {
  onRender?: () => void;
}

/** A modal that can be configured using a Component's template. Use it via the
 * CustomModal Service rather than directly. */
@Component({
  selector: 'custom-modal',
  template: `
    <div class="content" #content (click)="$event.stopPropagation()">
      <ng-container *ngIf="visible$ | async">
        <ng-content></ng-content>
      </ng-container>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        left: 0;
        z-index: 9001;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .content {
        position: absolute;
        pointer-events: initial;
      }
    `,
  ],
})
export class CustomModalComponent implements OnInit, OnDestroy {
  @Output() onOpen = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();

  readonly visible$ = new BehaviorSubject(false);
  private canClose = true;

  @ViewChild('content', {static: true})
  private readonly content!: ElementRef;

  static latestInstance: CustomModalComponent;
  parentEmbeddedViewRef?: EmbeddedViewRef<unknown>;
  clickListener: () => void = this.maybeClose.bind(this);

  constructor() {
    CustomModalComponent.latestInstance = this;
  }

  ngOnInit() {
    this.visible$.pipe(filter((visible) => !!visible)).subscribe((visible) => {
      window.requestAnimationFrame(() => {
        this.canClose = true;
        this.ensureContentIsWithinWindow();
        this.onOpen.emit();
      });
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.clickListener);
  }

  public openAtPosition(position: {x: number; y: number}) {
    this.content.nativeElement.style.left = position.x + 'px';
    this.content.nativeElement.style.top = position.y + 'px';
    this.canClose = false;
    this.visible$.next(true);
    document.addEventListener('click', this.clickListener);
  }

  private ensureContentIsWithinWindow() {
    if (!this.content) {
      return;
    }

    const boundingBox = this.content.nativeElement.getBoundingClientRect();
    if (boundingBox.left < 0) {
      this.content.nativeElement.style.left = 0;
    }
    if (boundingBox.left + boundingBox.width > window.innerWidth) {
      this.content.nativeElement.style.left =
        window.innerWidth - boundingBox.width + 'px';
    }

    if (boundingBox.top < 0) {
      this.content.nativeElement.style.top = 0;
    }
    if (boundingBox.top + boundingBox.height > window.innerHeight) {
      this.content.nativeElement.style.top =
        window.innerHeight - boundingBox.height + 'px';
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  private maybeClose() {
    if (!this.canClose) {
      return;
    }
    this.close();
  }

  public close() {
    document.removeEventListener('click', this.clickListener);
    this.onClose.emit();
    // Clean up enclosing embedded view if it exists.
    setTimeout(() => {
      this.parentEmbeddedViewRef?.destroy();
    });
  }
}
