import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {RunId} from '../../../../core/types';

@Component({
  selector: 'main-component',
  templateUrl: './main_component.ng.html',
  styleUrls: ['./main_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent {
  @Input() runs: Map<RunId, boolean> = new Map();
  get runActive(): boolean {
    let active = false;
    this.runs.forEach((runActive: boolean) => {
      active = active || runActive;
    });
    return active;
  }
}
