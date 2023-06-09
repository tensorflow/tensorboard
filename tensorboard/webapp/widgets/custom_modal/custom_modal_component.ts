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
        top: -64px; /* The height of the top bar */
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

  @ViewChild('content', {static: false})
  private readonly content!: ElementRef;

  private clickListener: () => void = this.close.bind(this);

  ngOnInit() {
    this.visible$.subscribe((visible) => {
      // Wait until after the next browser frame.
      window.requestAnimationFrame(() => {
        if (visible) {
          this.onOpen.emit();
        } else {
          this.onClose.emit();
        }
      });
    });
  }

  public openAtPosition(position: {x: number; y: number}) {
    this.content.nativeElement.style.left = position.x + 'px';
    this.content.nativeElement.style.top = position.y + 'px';
    this.visible$.next(true);
    document.addEventListener('click', this.clickListener);
  }

  @HostListener('document:keydown.escape', ['$event'])
  public close() {
    document.removeEventListener('click', this.clickListener);
    this.visible$.next(false);
  }
}
