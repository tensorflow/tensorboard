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
import {CustomModalComponent} from './custom_modal_component';
import {CustomModal} from './custom_modal';
import {CommonModule} from '@angular/common';
import {
  ApplicationRef,
  Component,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ViewRef,
} from '@angular/core';

function waitFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

@Component({
  selector: 'fake-modal-view-container',
  template: `
    <div #modal_container></div>
    <!-- In real use cases, the modal template below should be in a separate component. -->
    <ng-template #modalTemplate>
      <custom-modal>
        <div [style]="'width: 100px; height: 100px'">abc123</div>
      </custom-modal>
    </ng-template>
  `,
})
class FakeViewContainerComponent {
  @ViewChild('modal_container', {read: ViewContainerRef})
  readonly modalViewContainerRef!: ViewContainerRef;

  @ViewChild('modalTemplate', {read: TemplateRef})
  readonly modalTemplateRef!: TemplateRef<unknown>;

  constructor(readonly customModal: CustomModal) {}
}

describe('custom modal', () => {
  let viewContainerFixture: ComponentFixture<FakeViewContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FakeViewContainerComponent, CustomModalComponent],
      imports: [CommonModule],
    }).compileComponents();

    viewContainerFixture = TestBed.createComponent(FakeViewContainerComponent);
    // Make FakeViewContainerComponent the app root component.
    const appRef = TestBed.inject(ApplicationRef);
    appRef.components.push(viewContainerFixture.componentRef);
    viewContainerFixture.detectChanges();
  });

  it('creates a modal', async () => {
    const viewContainerComponent = viewContainerFixture.componentInstance;

    viewContainerComponent.customModal.createAtPosition(
      viewContainerComponent.modalTemplateRef,
      {x: 10, y: 20}
    );
    viewContainerFixture.detectChanges();

    const content = viewContainerFixture.debugElement.query(By.css('.content'));
    expect(content.nativeElement.innerHTML).toContain('abc123');
    expect(content.nativeElement.style.left).toEqual('10px');
    expect(content.nativeElement.style.top).toEqual('20px');
  });

  describe('runChangeDetection', () => {
    it('runs change detection on all modals in the modal ViewContainerRef', () => {
      const component = viewContainerFixture.componentInstance;
      component.customModal.createAtPosition(component.modalTemplateRef, {
        x: 10,
        y: 20,
      });
      component.customModal.createAtPosition(component.modalTemplateRef, {
        x: 11,
        y: 20,
      });
      component.customModal.createAtPosition(component.modalTemplateRef, {
        x: 12,
        y: 20,
      });
      const detectChangesSpies = [...Array(3)].map((_, i) =>
        spyOn(
          viewContainerFixture.componentInstance.modalViewContainerRef.get(
            i
          ) as ViewRef,
          'detectChanges'
        )
      );
      viewContainerFixture.detectChanges();

      component.customModal.runChangeDetection();

      expect(detectChangesSpies[0]).toHaveBeenCalled();
      expect(detectChangesSpies[1]).toHaveBeenCalled();
      expect(detectChangesSpies[2]).toHaveBeenCalled();
    });
  });

  describe('closeAll', () => {
    it('clears all modals in the modal ViewContainerRef', () => {
      const component = viewContainerFixture.componentInstance;
      component.customModal.createAtPosition(component.modalTemplateRef, {
        x: 10,
        y: 20,
      });
      component.customModal.createAtPosition(component.modalTemplateRef, {
        x: 11,
        y: 20,
      });
      component.customModal.createAtPosition(component.modalTemplateRef, {
        x: 12,
        y: 20,
      });
      viewContainerFixture.detectChanges();

      component.customModal.closeAll();

      expect(
        viewContainerFixture.componentInstance.modalViewContainerRef.length
      ).toBe(0);
    });
  });

  it('cleans up enclosing embeddedView on close', fakeAsync(() => {
    const viewContainerComponent = viewContainerFixture.componentInstance;
    const customModalComponent =
      viewContainerComponent.customModal.createAtPosition(
        viewContainerComponent.modalTemplateRef,
        {x: -10, y: -10}
      );
    viewContainerFixture.detectChanges();

    const content = viewContainerFixture.debugElement.query(By.css('.content'));
    customModalComponent!.close();
    viewContainerFixture.detectChanges();
    tick(); // Wait for setTimeout.

    expect(viewContainerComponent.modalViewContainerRef.length).toBe(0);
  }));

  it('waits a frame before emitting onOpen or onClose', async () => {
    const viewContainerComponent = viewContainerFixture.componentInstance;
    const customModalComponent =
      viewContainerComponent.customModal.createAtPosition(
        viewContainerComponent.modalTemplateRef,
        {x: 0, y: 0}
      );
    const onOpenSpy = spyOn(customModalComponent!.onOpen, 'emit');
    const onCloseSpy = spyOn(customModalComponent!.onClose, 'emit');
    expect(onOpenSpy).not.toHaveBeenCalled();
    viewContainerFixture.detectChanges();
    await waitFrame();
    expect(onOpenSpy).toHaveBeenCalled();
    customModalComponent!.close();
    viewContainerFixture.detectChanges();
    await waitFrame();
    expect(onCloseSpy).toHaveBeenCalled();
  });

  describe('closing behavior', () => {
    let onOpenSpy: jasmine.Spy;
    let onCloseSpy: jasmine.Spy;

    beforeEach(async () => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const customModalComponent =
        viewContainerComponent.customModal.createAtPosition(
          viewContainerComponent.modalTemplateRef,
          {x: 0, y: 0}
        );
      onOpenSpy = spyOn(customModalComponent!.onOpen, 'emit');
      onCloseSpy = spyOn(customModalComponent!.onClose, 'emit');
      viewContainerFixture.detectChanges();
      await waitFrame();
    });

    it('closes when escape key is pressed', async () => {
      expect(onOpenSpy).toHaveBeenCalled();
      const event = new KeyboardEvent('keydown', {key: 'escape'});
      document.dispatchEvent(event);
      await waitFrame();

      expect(onCloseSpy).toHaveBeenCalled();
    });

    it('closes when user clicks outside modal', async () => {
      expect(onOpenSpy).toHaveBeenCalled();
      document.body.click();
      await waitFrame();

      expect(onCloseSpy).toHaveBeenCalled();
    });
  });

  describe('ensures content is always within the window', () => {
    beforeEach(() => {
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1000);
      spyOnProperty(window, 'innerHeight', 'get').and.returnValue(1000);
    });

    it('sets left to 0 if less than 0', async () => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const customModalComponent =
        viewContainerComponent.customModal.createAtPosition(
          viewContainerComponent.modalTemplateRef,
          {x: -10, y: -10}
        );
      const onOpenSpy = spyOn(customModalComponent!.onOpen, 'emit');
      expect(onOpenSpy).not.toHaveBeenCalled();
      viewContainerFixture.detectChanges();
      await waitFrame();

      const content = viewContainerFixture.debugElement.query(
        By.css('.content')
      );
      expect(content.nativeElement.style.left).toEqual('0px');
    });

    it('sets top to 0 if less than 0', async () => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const customModalComponent =
        viewContainerComponent.customModal.createAtPosition(
          viewContainerComponent.modalTemplateRef,
          {x: 0, y: -10}
        );
      const onOpenSpy = spyOn(customModalComponent!.onOpen, 'emit');
      expect(onOpenSpy).not.toHaveBeenCalled();
      viewContainerFixture.detectChanges();
      await waitFrame();

      const content = viewContainerFixture.debugElement.query(
        By.css('.content')
      );
      expect(content.nativeElement.style.top).toEqual('0px');
    });

    it('sets left to maximum if content overflows the window', async () => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const customModalComponent =
        viewContainerComponent.customModal.createAtPosition(
          viewContainerComponent.modalTemplateRef,
          {x: 1010, y: 0}
        );
      const onOpenSpy = spyOn(customModalComponent!.onOpen, 'emit');
      expect(onOpenSpy).not.toHaveBeenCalled();
      viewContainerFixture.detectChanges();
      await waitFrame();
      const content = viewContainerFixture.debugElement.query(
        By.css('.content')
      );
      // While rendering in a test the elements width and height will appear to be 0.
      expect(content.nativeElement.style.left).toEqual('900px');
    });

    it('sets top to maximum if content overflows the window', async () => {
      const viewContainerComponent = viewContainerFixture.componentInstance;
      const customModalComponent =
        viewContainerComponent.customModal.createAtPosition(
          viewContainerComponent.modalTemplateRef,
          {x: 0, y: 1010}
        );
      const onOpenSpy = spyOn(customModalComponent!.onOpen, 'emit');
      expect(onOpenSpy).not.toHaveBeenCalled();
      viewContainerFixture.detectChanges();
      await waitFrame();
      const content = viewContainerFixture.debugElement.query(
        By.css('.content')
      );
      // While rendering in a test the elements width and height will appear to be 0.
      expect(content.nativeElement.style.top).toEqual('900px');
    });
  });
});
