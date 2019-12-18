import {PolymerElement, html} from '@polymer/polymer';
import {LegacyElementMixin} from '@polymer/polymer/lib/legacy/legacy-element-mixin';
import {customElement, property} from '@polymer/decorators';
import '../tf-dashboard-common/tensorboard-color';

@customElement('tf-option-selector')
class TfOptionSelector extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <div id="wrap">
      <h3>[[name]]</h3>
      <div class="content-wrapper"><slot></slot></div>
    </div>
    <style>
      .content-wrapper ::slotted(*) > * {
        width: 30%;
        font-size: 13px;
        background: none;
        margin-top: 10px;
        color: var(--tb-ui-dark-accent);
      }

      .content-wrapper ::slotted(*) :first-of-type {
        margin-left: 0;
      }

      .content-wrapper ::slotted(*) .selected {
        background-color: var(--tb-ui-dark-accent);
        color: white !important;
      }

      h3 {
        color: var(--paper-grey-800);
        margin: 0;
        font-weight: normal;
        font-size: 14px;
        margin-bottom: 5px;
        display: block;
        pointer-events: none;
      }
    </style>
  `;

  @property({type: String})
  name!: string;

  @property({type: String, observer: '_selectedIdChanged', notify: true})
  selectedId?: string;

  attached() {
    this.async(() => {
      this.getEffectiveChildren().forEach((node: Element) => {
        this.listen(node, 'tap', '_selectTarget');
      });
    });
  }
  _selectTarget(e: CustomEvent) {
    const element = e.currentTarget as Element;
    this.selectedId = element.id;
  }

  _selectedIdChanged() {
    const selected = this.queryEffectiveChildren('#' + this.selectedId);
    if (!selected) {
      return;
    }

    this.getEffectiveChildren().forEach((node: Element) => {
      node.classList.remove('selected');
    });

    if (selected instanceof Element) {
      selected.classList.add('selected');
    }
  }
}
