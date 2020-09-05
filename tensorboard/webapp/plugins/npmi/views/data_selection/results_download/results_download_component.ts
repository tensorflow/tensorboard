import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';

@Component({
  selector: 'results-download-component',
  templateUrl: './results_download_component.ng.html',
  styleUrls: ['./results_download_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsDownloadComponent {
  @Input() flaggedAnnotations!: string[];
  @Output() onDownloadRequested = new EventEmitter();
}
