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
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {CustomModal} from './custom_modal';
import {CommonModule} from '@angular/common';
import {
  Component,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import {Overlay, OverlayModule, OverlayRef} from '@angular/cdk/overlay';
import {first} from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'fake-modal-view-container',
  template: `
    <button class="modal-trigger-button">Modal trigger button</button>
    <button class="another-modal-trigger-button">
      Another modal trigger button
    </button>
    <ng-template #modalTemplate>
      <div class="content">abc123</div>
    </ng-template>
    <ng-template #anotherModalTemplate>
      <div class="another-content">xyz</div>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 400px;
        height: 400px;
      }

      .content,
      .another-content {
        // Make modals small to allow easily testing clicking outside of modals.
        width: 10px;
        height: 10px;
      }
    `,
  ],
})
class FakeViewContainerComponent {
  @ViewChild('modalTemplate', {read: TemplateRef})
  readonly modalTemplateRef!: TemplateRef<unknown>;

  @ViewChild('anotherModalTemplate', {read: TemplateRef})
  readonly anotherModalTemplateRef!: TemplateRef<unknown>;

  constructor(
    readonly customModal: CustomModal,
    readonly vcRef: ViewContainerRef
  ) {}
}

describe('custom modal', () => {
  let viewContainerFixture: ComponentFixture<FakeViewContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FakeViewContainerComponent],
      imports: [CommonModule, OverlayModule],
    }).compileComponents();

    viewContainerFixture = TestBed.createComponent(FakeViewContainerComponent);
    viewContainerFixture.detectChanges();
  });

  it('creates a modal', () => {
    const viewContainerComponent = viewContainerFixture.componentInstance;
    const modalTriggerButton = viewContainerFixture.debugElement.query(
      By.css('.modal-trigger-button')
    ).nativeElement;
    const overlay = TestBed.inject(Overlay);
    const createSpy = spyOn(overlay, 'create').and.callThrough();
    const attachSpy = spyOn(OverlayRef.prototype, 'attach').and.callThrough();

    viewContainerComponent.customModal.createNextToElement(
      viewContainerComponent.modalTemplateRef,
      modalTriggerButton,
      viewContainerComponent.vcRef
    );
    viewContainerFixture.detectChanges();

    const content = viewContainerFixture.debugElement.query(By.css('.content'));
    expect(content.nativeElement.innerHTML).toContain('abc123');
    const createArg = createSpy.calls.mostRecent().args[0]!;
    expect(createArg.positionStrategy).toEqual(
      jasmine.objectContaining({
        positions: [
          {
            originX: 'end',
            originY: 'top',
            overlayX: 'start',
            overlayY: 'top',
          },
        ],
      })
    );
    const attachArgs = attachSpy.calls.mostRecent().args[0];
    expect(attachArgs.templateRef).toBe(
      viewContainerComponent.modalTemplateRef
    );
    expect(attachArgs.viewContainerRef).toBe(viewContainerComponent.vcRef);
  });

  describe('overlay event subscriptions', () => {
    it('subscribes to click and pointer events on create', fakeAsync(() => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const modalTriggerButton = viewContainerFixture.debugElement.query(
        By.css('.modal-trigger-button')
      ).nativeElement;

      const customModalRef =
        viewContainerComponent.customModal.createNextToElement(
          viewContainerComponent.modalTemplateRef,
          modalTriggerButton,
          viewContainerComponent.vcRef
        )!;
      tick();

      expect(customModalRef.subscriptions.length).toEqual(2);
    }));

    it('cleans up subscriptions on removal', fakeAsync(() => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const modalTriggerButton = viewContainerFixture.debugElement.query(
        By.css('.modal-trigger-button')
      ).nativeElement;
      const customModalRef =
        viewContainerComponent.customModal.createNextToElement(
          viewContainerComponent.modalTemplateRef,
          modalTriggerButton,
          viewContainerComponent.vcRef
        )!;
      tick();

      viewContainerComponent.customModal.close(customModalRef);

      expect(customModalRef.subscriptions.length).toEqual(0);
    }));
  });

  describe('closeAll', () => {
    it('clears all modals in the modal ViewContainerRef', () => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const modalTriggerButton = viewContainerFixture.debugElement.query(
        By.css('.modal-trigger-button')
      ).nativeElement;
      const anotherModalTriggerButton = viewContainerFixture.debugElement.query(
        By.css('.another-modal-trigger-button')
      ).nativeElement;
      viewContainerComponent.customModal.createNextToElement(
        viewContainerComponent.modalTemplateRef,
        modalTriggerButton,
        viewContainerComponent.vcRef
      );
      viewContainerComponent.customModal.createNextToElement(
        viewContainerComponent.anotherModalTemplateRef,
        anotherModalTriggerButton,
        viewContainerComponent.vcRef
      );
      viewContainerFixture.detectChanges();

      TestBed.inject(CustomModal).closeAll();

      const content = viewContainerFixture.debugElement.query(
        By.css('.content')
      );
      const anotherContent = viewContainerFixture.debugElement.query(
        By.css('.another-content')
      );
      expect(content).toBeNull();
      expect(anotherContent).toBeNull();
      expect(viewContainerComponent.vcRef.length).toBe(0);
    });
  });

  describe('closing behavior', () => {
    it('emits onClose event on close', fakeAsync(() => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const modalTriggerButton = viewContainerFixture.debugElement.query(
        By.css('.modal-trigger-button')
      ).nativeElement;
      const customModalRef =
        viewContainerComponent.customModal.createNextToElement(
          viewContainerComponent.modalTemplateRef,
          modalTriggerButton,
          viewContainerComponent.vcRef
        )!;

      customModalRef.onClose.pipe(first()).subscribe((val) => {
        // onClose should emit an empty value.
        expect(val).toBeUndefined();
      });

      viewContainerComponent.customModal.close(customModalRef);
      tick();
    }));

    it('closes when escape key is pressed', fakeAsync(() => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const modalTriggerButton = viewContainerFixture.debugElement.query(
        By.css('.modal-trigger-button')
      ).nativeElement;
      viewContainerComponent.customModal.createNextToElement(
        viewContainerComponent.modalTemplateRef,
        modalTriggerButton,
        viewContainerComponent.vcRef
      );
      viewContainerFixture.detectChanges();
      tick();
      const content = viewContainerFixture.debugElement.query(
        By.css('.content')
      );

      const event = new KeyboardEvent('keydown', {key: 'Escape'});
      document.body.dispatchEvent(event);
      viewContainerFixture.detectChanges();
      tick();

      expect(viewContainerComponent.vcRef.length).toBe(0);
      expect(
        viewContainerFixture.debugElement.query(By.css('.content'))
      ).toBeNull();
    }));

    it('closes all modals when user clicks an area outside all modals', fakeAsync(() => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const modalTriggerButton = viewContainerFixture.debugElement.query(
        By.css('.modal-trigger-button')
      ).nativeElement;
      const anotherModalTriggerButton = viewContainerFixture.debugElement.query(
        By.css('.another-modal-trigger-button')
      ).nativeElement;
      viewContainerComponent.customModal.createNextToElement(
        viewContainerComponent.modalTemplateRef,
        modalTriggerButton,
        viewContainerComponent.vcRef
      );
      viewContainerComponent.customModal.createNextToElement(
        viewContainerComponent.anotherModalTemplateRef,
        anotherModalTriggerButton,
        viewContainerComponent.vcRef
      );
      viewContainerFixture.detectChanges();
      tick();

      const event = new MouseEvent('click', {clientX: 300, clientY: 300});
      viewContainerFixture.nativeElement.dispatchEvent(event);
      viewContainerFixture.detectChanges();

      const content = viewContainerFixture.debugElement.query(
        By.css('.content')
      );
      const anotherContent = viewContainerFixture.debugElement.query(
        By.css('.another-content')
      );
      expect(content).toBeNull();
      expect(anotherContent).toBeNull();
      expect(viewContainerComponent.vcRef.length).toBe(0);
    }));

    it('does not close when a click is inside at least one modal', async () => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const modalTriggerButton = viewContainerFixture.debugElement.query(
        By.css('.modal-trigger-button')
      ).nativeElement;
      const anotherModalTriggerButton = viewContainerFixture.debugElement.query(
        By.css('.another-modal-trigger-button')
      ).nativeElement;
      viewContainerComponent.customModal.createNextToElement(
        viewContainerComponent.modalTemplateRef,
        modalTriggerButton,
        viewContainerComponent.vcRef
      );
      viewContainerComponent.customModal.createNextToElement(
        viewContainerComponent.anotherModalTemplateRef,
        anotherModalTriggerButton,
        viewContainerComponent.vcRef
      );
      viewContainerFixture.detectChanges();
      const content = viewContainerFixture.debugElement.query(
        By.css('.content')
      );
      const anotherContent = viewContainerFixture.debugElement.query(
        By.css('.another-content')
      );

      // Event is in first modal.
      const event = new MouseEvent('click', {clientX: 101, clientY: 101});
      content.nativeElement.dispatchEvent(event);
      viewContainerFixture.detectChanges();

      expect(content.nativeElement.innerHTML).toContain('abc123');
      expect(anotherContent.nativeElement.innerHTML).toContain('xyz');
    });
  });
});
