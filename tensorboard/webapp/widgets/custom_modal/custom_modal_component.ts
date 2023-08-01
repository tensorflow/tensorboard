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
  ViewContainerRef,
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

export interface ModalContent {
  onRender?: () => void;
}

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
      }

      .content {
        position: absolute;
      }
    `,
  ],
})
export class CustomModalComponent implements OnInit {
  @Output() onOpen = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();

  readonly visible$ = new BehaviorSubject(false);
  private readonly canClose$ = new BehaviorSubject(true);

  @ViewChild('content', {static: false})
  private readonly content!: ElementRef;

  private clickListener: () => void = this.maybeClose.bind(this);

  constructor(private readonly viewRef: ViewContainerRef) {}

  ngOnInit() {
    this.visible$.subscribe((visible) => {
      // Wait until after the next browser frame.
      window.requestAnimationFrame(() => {
        this.canClose$.next(true);
        if (visible) {
          this.ensureContentIsWithinWindow();
          this.onOpen.emit();
        } else {
          this.onClose.emit();
        }
      });
    });
  }

  public openAtPosition(position: {x: number; y: number}) {
    const root = this.viewRef.element.nativeElement;
    const top = root.getBoundingClientRect().top;
    if (top !== 0) {
      root.style.top = top * -1 + root.offsetTop + 'px';
    }

    this.content.nativeElement.style.left = position.x + 'px';
    this.content.nativeElement.style.top = position.y + 'px';
    this.canClose$.next(false);
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
    if (!this.canClose$.getValue()) {
      return;
    }
    this.close();
  }

  public close() {
    document.removeEventListener('click', this.clickListener);
    this.visible$.next(false);
  }
}
