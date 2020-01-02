import {PolymerElement, html} from '@polymer/polymer';
import {customElement, property} from '@polymer/decorators';
import '@polymer/iron-icon';
import '@polymer/paper-input/paper-input';
import {getStringInitializer, getStringObserver} from '../tf_storage/storage';

@customElement('tf-tag-filterer')
class TfTagFilterer extends PolymerElement {
  static readonly template = html`
    <paper-input
      no-label-float=""
      label="Filter tags (regular expressions supported)"
      value="{{_tagFilter}}"
      class="search-input"
    >
      <iron-icon prefix="" icon="search" slot="prefix"></iron-icon>
    </paper-input>
    <style>
      :host {
        display: block;
        margin: 10px 5px 10px 10px;
      }
    </style>
  `;

  /** Value of the search box. */
  @property({
    type: String,
    notify: true,
    computed: '_computeTagFilter(_tagFilter)',
  })
  tagFilter: string = '';

  @property({
    type: String,
    observer: '_tagFilterObserver',
  })
  _tagFilter: string = getStringInitializer('tagFilter', {
    defaultValue: '',
    useLocalStorage: false,
    polymerProperty: '_tagFilter',
  })();

  private _tagFilterObserver = getStringObserver('tagFilter', {
    defaultValue: '',
    useLocalStorage: false,
    polymerProperty: '_tagFilter',
  });

  _computeTagFilter(): string {
    return this._tagFilter;
  }
}
