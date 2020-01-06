import {html} from '@polymer/polymer';
import {customElement, property, computed, observe} from '@polymer/decorators';
import '@polymer/iron-icons';
import '@polymer/paper-button';
import '@polymer/paper-checkbox';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu';
import '@polymer/paper-dialog';
import '@polymer/paper-header-panel';
import '@polymer/paper-listbox';
import '@polymer/paper-icon-button';
import {PaperInputElement} from '@polymer/paper-input/paper-input';
import '@polymer/paper-tabs';
import '@polymer/paper-toolbar';
import {
  RequestManager,
  Canceller,
  getRouter,
  setRouter,
  environmentStore,
  runsStore,
  experimentsStore,
  Router,
} from '../tf_backend';
import '../tf_dashboard_common/tensorboard-color';
import {setUseHash} from '../tf_globals/globals';
import {getLimit, setLimit} from '../tf_paginated_view/paginatedViewStore';
import {getString, setString, TAB} from '../tf_storage/storage';
import {ActiveDashboardsLoadState, dashboardRegistry} from './registry';
import {AbstractAutoReloadBehavior} from './autoReloadBehavior';
/** Bootstrap and listen to messages from plugin iframes. */
import '../experimental/plugin_util';

enum LoadingMechanismType {
  CUSTOM_ELEMENT = 'CUSTOM_ELEMENT',
  IFRAME = 'IFRAME',
  NG_COMPONENT = 'NG_COMPONENT',
  NONE = 'NONE',
}

interface NgElementLoadingMechanism {
  /** @export */
  type: LoadingMechanismType.NG_COMPONENT;
}

interface CustomElementLoadingMechanism {
  /** @export */
  type: LoadingMechanismType.CUSTOM_ELEMENT;
  /** @export */
  elementName: string;
}

interface IframeLoadingMechanism {
  /** @export */
  type: LoadingMechanismType.IFRAME;
  /** @export */
  modulePath: string;
}

interface NoLoadingMechanism {
  /** @export */
  type: LoadingMechanismType.NONE;
}

interface BackendPluginMetadata {
  disable_reload: boolean;
  enabled?: boolean;
  loading_mechanism:
    | NgElementLoadingMechanism
    | {
        type: LoadingMechanismType.CUSTOM_ELEMENT;
        element_name: string;
      }
    | {
        type: LoadingMechanismType.IFRAME;
        module_path: string;
      }
    | NoLoadingMechanism;
  tab_name: string;
  remove_dom: boolean;
}

interface UiPluginMetadata {
  plugin: string;
  disableReload: boolean;
  enabled?: boolean;
  loadingMechanism:
    | NgElementLoadingMechanism
    | CustomElementLoadingMechanism
    | IframeLoadingMechanism
    | NoLoadingMechanism;
  tabName: string;
  removeDom: boolean;
}

type DashboardRegistry = {
  [name: string]: UiPluginMetadata;
};

interface Dashboard {
  reload: () => void;
}

@customElement('tf-tensorboard')
class TfTensorboard extends AbstractAutoReloadBehavior {
  static readonly template = html`
    <paper-dialog with-backdrop="" id="settings">
      <h2>Settings</h2>
      <paper-checkbox id="auto-reload-checkbox" checked="{{autoReloadEnabled}}">
        Reload data every <span>[[autoReloadIntervalSecs]]</span>s.
      </paper-checkbox>
      <paper-input
        id="paginationLimitInput"
        label="Pagination limit"
        always-float-label=""
        type="number"
        min="1"
        step="1"
        on-change="_paginationLimitChanged"
        on-value-changed="_paginationLimitValidate"
      ></paper-input>
    </paper-dialog>
    <paper-header-panel>
      <paper-toolbar id="toolbar" slot="header" class="header">
        <div id="toolbar-content" slot="top">
          <div class="toolbar-title">[[brand]]</div>
          <template is="dom-if" if="[[_activeDashboardsNotLoaded]]">
            <span class="toolbar-message">
              Loading active dashboards…
            </span>
          </template>
          <template is="dom-if" if="[[_activeDashboardsLoaded]]">
            <paper-tabs
              noink=""
              scrollable=""
              selected="{{_selectedDashboard}}"
              attr-for-selected="data-dashboard"
            >
              <template
                is="dom-repeat"
                items="[[_dashboardData]]"
                as="dashboardDatum"
              >
                <template
                  is="dom-if"
                  if="[[_isDashboardActive(disabledDashboards, _activeDashboards, dashboardDatum)]]"
                >
                  <paper-tab
                    data-dashboard$="[[dashboardDatum.plugin]]"
                    title="[[dashboardDatum.tabName]]"
                  >
                    [[dashboardDatum.tabName]]
                  </paper-tab>
                </template>
              </template>
            </paper-tabs>
            <template
              is="dom-if"
              if="[[_inactiveDashboardsExist(_dashboardData, disabledDashboards, _activeDashboards)]]"
            >
              <paper-dropdown-menu
                label="INACTIVE"
                no-label-float=""
                noink=""
                style="margin-left: 12px"
              >
                <paper-listbox
                  id="inactive-dashboards-menu"
                  slot="dropdown-content"
                  selected="{{_selectedDashboard}}"
                  attr-for-selected="data-dashboard"
                >
                  <template
                    is="dom-repeat"
                    items="[[_dashboardData]]"
                    as="dashboardDatum"
                  >
                    <template
                      is="dom-if"
                      if="[[_isDashboardInactive(disabledDashboards, _activeDashboards, dashboardDatum)]]"
                      restamp=""
                    >
                      <paper-item data-dashboard$="[[dashboardDatum.plugin]]"
                        >[[dashboardDatum.tabName]]</paper-item
                      >
                    </template>
                  </template>
                </paper-listbox>
              </paper-dropdown-menu>
            </template>
          </template>
          <div class="global-actions">
            <slot name="injected-header-items"></slot>
            <paper-icon-button
              id="reload-button"
              class$="[[_getDataRefreshingClass(_refreshing)]]"
              disabled$="[[_isReloadDisabled]]"
              icon="refresh"
              on-tap="reload"
              title$="Last updated: [[_lastReloadTimeShort]]"
            ></paper-icon-button>
            <paper-icon-button
              icon="settings"
              on-tap="openSettings"
              id="settings-button"
            ></paper-icon-button>
            <a
              href="https://github.com/tensorflow/tensorboard/blob/master/README.md"
              rel="noopener noreferrer"
              tabindex="-1"
              target="_blank"
            >
              <paper-icon-button icon="help-outline"></paper-icon-button>
            </a>
          </div>
        </div>
      </paper-toolbar>

      <div id="content-pane" class="fit">
        <slot name="injected-overview"></slot>
        <div id="content">
          <template is="dom-if" if="[[_activeDashboardsFailedToLoad]]">
            <div class="warning-message">
              <h3>Failed to load the set of active dashboards.</h3>
              <p>
                This can occur if the TensorBoard backend is no longer running.
                Perhaps this page is cached?
              </p>

              <p>
                If you think that you’ve fixed the problem, click the reload
                button in the top-right.
                <template is="dom-if" if="[[autoReloadEnabled]]">
                  We’ll try to reload every
                  [[autoReloadIntervalSecs]]&nbsp;seconds as well.
                </template>
              </p>

              <p>
                <i>Last reload: [[_lastReloadTime]]</i>
                <template is="dom-if" if="[[_dataLocation]]">
                  <p>
                    <i
                      >Log directory:
                      <span id="data_location">[[_dataLocation]]</span></i
                    >
                  </p>
                </template>
              </p>
            </div>
          </template>
          <template is="dom-if" if="[[_showNoDashboardsMessage]]">
            <div class="warning-message">
              <h3>No dashboards are active for the current data set.</h3>
              <p>Probable causes:</p>
              <ul>
                <li>You haven’t written any data to your event files.</li>
                <li>TensorBoard can’t find your event files.</li>
              </ul>

              If you’re new to using TensorBoard, and want to find out how to
              add data and set up your event files, check out the
              <a
                href="https://github.com/tensorflow/tensorboard/blob/master/README.md"
                >README</a
              >
              and perhaps the
              <a
                href="https://www.tensorflow.org/get_started/summaries_and_tensorboard"
                >TensorBoard tutorial</a
              >.
              <p>
                If you think TensorBoard is configured properly, please see
                <a
                  href="https://github.com/tensorflow/tensorboard/blob/master/README.md#my-tensorboard-isnt-showing-any-data-whats-wrong"
                  >the section of the README devoted to missing data problems</a
                >
                and consider filing an issue on GitHub.
              </p>

              <p>
                <i>Last reload: [[_lastReloadTime]]</i>
                <template is="dom-if" if="[[_dataLocation]]">
                  <p>
                    <i
                      >Data location:
                      <span id="data_location">[[_dataLocation]]</span></i
                    >
                  </p>
                </template>
              </p>
            </div>
          </template>
          <template is="dom-if" if="[[_showNoSuchDashboardMessage]]">
            <div class="warning-message">
              <h3>
                There’s no dashboard by the name of
                “<tt>[[_selectedDashboard]]</tt>.”
              </h3>
              <template is="dom-if" if="[[_activeDashboardsLoaded]]">
                <p>You can select a dashboard from the list above.</p></template
              >

              <p>
                <i>Last reload: [[_lastReloadTime]]</i>
                <template is="dom-if" if="[[_dataLocation]]">
                  <p>
                    <i
                      >Data location:
                      <span id="data_location">[[_dataLocation]]</span></i
                    >
                  </p>
                </template>
              </p>
            </div>
          </template>
          <template
            is="dom-repeat"
            id="dashboards-template"
            items="[[_dashboardData]]"
            as="dashboardDatum"
            on-dom-change="_onTemplateChanged"
          >
            <div
              class="dashboard-container"
              data-dashboard$="[[dashboardDatum.plugin]]"
              data-selected$="[[_selectedStatus(_selectedDashboard, dashboardDatum.plugin)]]"
            >
              <!-- Dashboards will be injected here dynamically. -->
            </div>
          </template>
        </div>
      </div>
    </paper-header-panel>

    <style>
      :host {
        height: 100%;
        display: block;
        background-color: var(--paper-grey-100);
      }

      #toolbar {
        background-color: var(
          --tb-toolbar-background-color,
          var(--tb-orange-strong)
        );
        -webkit-font-smoothing: antialiased;
      }

      .toolbar-title {
        font-size: 20px;
        margin-left: 10px;
        text-rendering: optimizeLegibility;
        letter-spacing: -0.025em;
        font-weight: 500;
        display: var(--tb-toolbar-title-display, block);
      }

      .toolbar-message {
        opacity: 0.7;
        -webkit-font-smoothing: antialiased;
        font-size: 14px;
        font-weight: 500;
      }

      paper-tabs {
        flex-grow: 1;
        width: 100%;
        height: 100%;
        --paper-tabs-selection-bar-color: white;
        --paper-tabs-content: {
          -webkit-font-smoothing: antialiased;
          text-transform: uppercase;
        }
      }

      paper-dropdown-menu {
        --paper-input-container-color: rgba(255, 255, 255, 0.8);
        --paper-input-container-focus-color: white;
        --paper-input-container-input-color: white;
        --paper-dropdown-menu-icon: {
          color: white;
        }
        --paper-dropdown-menu-input: {
          -webkit-font-smoothing: antialiased;
          font-size: 14px;
          font-weight: 500;
        }
        --paper-input-container-label: {
          -webkit-font-smoothing: antialiased;
          font-size: 14px;
          font-weight: 500;
        }
      }

      paper-dropdown-menu paper-item {
        -webkit-font-smoothing: antialiased;
        font-size: 14px;
        font-weight: 500;
        text-transform: uppercase;
      }

      #inactive-dashboards-menu {
        --paper-listbox-background-color: var(
          --tb-toolbar-background-color,
          var(--tb-orange-strong)
        );
        --paper-listbox-color: white;
      }

      .global-actions {
        display: inline-flex; /* Ensure that icons stay aligned */
        justify-content: flex-end;
        align-items: center;
        text-align: right;
        color: white;
      }

      .global-actions a {
        color: white;
      }

      #toolbar-content {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }

      #content-pane {
        align-items: stretch;
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: stretch;
        width: 100%;
      }

      #content {
        flex: 1 1;
        overflow: hidden;
      }

      .dashboard-container {
        height: 100%;
      }

      /* Hide unselected dashboards. We still display them within a container
         of height 0 since Plottable produces degenerate charts when charts are
         reloaded while not displayed. */
      .dashboard-container:not([data-selected]) {
        max-height: 0;
        overflow: hidden;
        position: relative;
        /** We further make containers invisible. Some elements may anchor to
            the viewport instead of the container, in which case setting the max
            height here to 0 will not hide them. */
        visibility: hidden;
      }

      .dashboard-container iframe {
        border: none;
        height: 100%;
        width: 100%;
      }

      .warning-message {
        max-width: 540px;
        margin: 80px auto 0 auto;
      }

      [disabled] {
        opacity: 0.2;
        color: white;
      }

      #reload-button.refreshing {
        animation: rotate 2s linear infinite;
      }

      @keyframes rotate {
        0% {
          transform: rotate(0deg);
        }
        50% {
          transform: rotate(180deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    </style>
  `;

  /**
   * Title name displayed in top left corner of GUI.
   *
   * This defaults to TensorBoard-X because we recommend against custom
   * builds being branded as TensorBoard.
   */
  @property({
    type: String,
  })
  brand: string = 'TensorBoard-X';

  /**
   * Deprecated: Equivalent to 'brand' attribute.
   */
  @property({
    type: String,
    observer: '_updateTitle',
  })
  title: string = '';

  /**
   * We accept a router property only for backward compatibility:
   * setting it triggers an observer that simply calls
   * `tf_backend.setRouter`.
   */
  @property({
    type: Object,
    observer: '_updateRouter',
  })
  router?: object;

  /**
   * Set this to true to store state in URI hash. Should be true
   * for all non-test purposes.
   */
  @property({
    type: Boolean,
  })
  useHash: boolean = false;

  /**
   * A comma-separated list of dashboards not to use.
   */
  @property({
    type: String,
  })
  disabledDashboards: string = '';

  @property({
    type: Object,
  })
  _pluginsListing: {
    [pluginName: string]: BackendPluginMetadata;
  } = {};

  @property({
    type: String,
  })
  _activeDashboardsLoadState: string = ActiveDashboardsLoadState.NOT_LOADED;

  /**
   * The plugin name of the currently selected dashboard, or `null` if no
   * dashboard is selected, which corresponds to an empty hash. Defaults
   * to the value stored in the hash.
   */
  @property({
    type: String,
    observer: '_selectedDashboardChanged',
  })
  _selectedDashboard: string | null = getString(TAB) || null;

  @property({type: String})
  _dashboardToMaybeRemove: string | null = null;

  @property({
    type: Object,
  })
  _dashboardContainersStamped: {
    [dashboardName: string]: boolean;
  } = {};

  @property({
    type: Boolean,
  })
  _isReloadDisabled: boolean = false;

  @property({
    type: String,
  })
  _lastReloadTime: string = 'not yet loaded';

  @property({
    type: String,
  })
  _lastReloadTimeShort: string = 'Not yet loaded';

  @property({
    type: String,
  })
  _dataLocation: string | null = null;

  @property({
    type: Object,
  })
  _requestManager = new RequestManager();

  @property({
    type: Object,
  })
  _canceller = new Canceller();

  @property({
    type: Boolean,
  })
  _refreshing: boolean = false;

  /**
   * @param {string?} disabledDashboards comma-separated
   * @param {Array<string>?} activeDashboards if null, nothing is active
   * @param {Object} dashboardDatum
   * @return {boolean}
   */
  _isDashboardActive(
    disabledDashboards: string,
    activeDashboards: string[],
    dashboardDatum: UiPluginMetadata
  ) {
    if (
      (disabledDashboards || '').split(',').indexOf(dashboardDatum.plugin) >= 0
    ) {
      // Explicitly disabled.
      return false;
    }
    if (!(activeDashboards || []).includes(dashboardDatum.plugin)) {
      // Inactive.
      return false;
    }
    return true;
  }
  /**
   * Determine whether a dashboard is enabled but not active.
   *
   * @param {string?} disabledDashboards comma-separated
   * @param {Array<string>?} activeDashboards if null, nothing is active
   * @param {Object} dashboardDatum
   * @return {boolean}
   */
  _isDashboardInactive(
    disabledDashboards: string,
    activeDashboards: string[],
    dashboardDatum: UiPluginMetadata
  ) {
    if (
      (disabledDashboards || '').split(',').indexOf(dashboardDatum.plugin) >= 0
    ) {
      // Disabled dashboards don't appear at all; they're not just
      // inactive.
      return false;
    }
    if (!(activeDashboards || []).includes(dashboardDatum.plugin)) {
      // Inactive.
      return true;
    }
    return false;
  }
  _inactiveDashboardsExist(
    dashboards: UiPluginMetadata[],
    disabledDashboards: string,
    activeDashboards: string[]
  ) {
    if (!activeDashboards) {
      // Not loaded yet. Show nothing.
      return false;
    }
    const workingSet = new Set();
    dashboards.forEach((d) => {
      workingSet.add(d.plugin);
    });
    (disabledDashboards || '').split(',').forEach((d) => {
      workingSet.delete(d);
    });
    activeDashboards.forEach((d) => {
      workingSet.delete(d);
    });
    return workingSet.size > 0;
  }

  _selectedStatus(selectedDashboard: string, candidateDashboard: string) {
    return selectedDashboard === candidateDashboard;
  }
  /**
   * Handle a change in the selected dashboard by persisting the current
   * selection to the hash and logging a pageview if analytics are enabled.
   */
  _selectedDashboardChanged(selectedDashboard?: string) {
    const pluginString = selectedDashboard || '';
    setString(TAB, pluginString);
    // Record this dashboard selection as a page view.
    let pathname = window.location.pathname;
    pathname += pathname.endsWith('/') ? pluginString : '/' + pluginString;
    ga('set', 'page', pathname);
    ga('send', 'pageview');
  }
  /**
   * If no dashboard is selected but dashboards are available,
   * set the selected dashboard to the first active one.
   */
  @observe('_selectedDashboard', '_activeDashboards')
  _updateSelectedDashboardFromActive(
    selectedDashboard: string | null,
    activeDashboards: string[]
  ) {
    if (activeDashboards && selectedDashboard == null) {
      selectedDashboard = activeDashboards[0] || null;
      if (selectedDashboard != null) {
        // Use location.replace for this call to avoid breaking back-button navigation.
        // Note that this will precede the update to tf_storage triggered by updating
        // _selectedDashboard and make it a no-op.
        setString(TAB, selectedDashboard, {
          useLocationReplace: true,
        });
        // Note: the following line will re-trigger this handler, but it
        // will be a no-op since selectedDashboard is no longer null.
        this._selectedDashboard = selectedDashboard;
      }
    }
  }
  _updateSelectedDashboardFromHash() {
    const dashboardName = getString(TAB);
    this.set('_selectedDashboard', dashboardName || null);
  }
  /**
   * Make sure that the currently selected dashboard actually has a
   * Polymer component; if it doesn't, create one.
   *
   * We have to stamp each dashboard before we can interact with it:
   * for instance, to ask it to reload. Conversely, we can't stamp a
   * dashboard until its _container_ is itself stamped. (Containers
   * are stamped declaratively by a `<dom-repeat>` in the HTML
   * template.)
   *
   * We also wait for the set of active dashboards to be loaded
   * before we stamp anything. This prevents us from stamping a
   * dashboard that's not actually enabled (e.g., if the user
   * navigates to `/#text` when the text plugin is disabled).
   *
   * If the currently selected dashboard is not a real dashboard,
   * this does nothing.
   *
   * @param {!Object<string, !DashboardDatum>} dashboardRegistry
   */
  @observe(
    '_dashboardRegistry',
    '_dashboardContainersStamped',
    '_activeDashboards',
    '_selectedDashboard'
  )
  _ensureSelectedDashboardStamped(
    dashboardRegistry: DashboardRegistry,
    containersStamped: {[pluginName: string]: boolean},
    activeDashboards: string[],
    selectedDashboard: string
  ) {
    if (
      !activeDashboards ||
      !selectedDashboard ||
      !containersStamped[selectedDashboard]
    ) {
      return;
    }
    const previous = this._dashboardToMaybeRemove;
    this._dashboardToMaybeRemove = selectedDashboard;
    if (previous && previous != selectedDashboard) {
      if (dashboardRegistry[previous].removeDom) {
        const div = this.$$(`.dashboard-container[data-dashboard=${previous}]`);
        if (div && div.firstChild) {
          div.firstChild.remove();
        }
      }
    }
    const container = this.$$(
      `.dashboard-container[data-dashboard=${selectedDashboard}]`
    );
    if (!container) {
      // This dashboard doesn't exist. Nothing to do here.
      return;
    }
    const dashboard = dashboardRegistry[selectedDashboard];
    // Use .children, not .childNodes, to avoid counting comment nodes.
    if (container.children.length === 0) {
      const loadingMechanism = dashboard.loadingMechanism;
      switch (loadingMechanism.type) {
        case LoadingMechanismType.CUSTOM_ELEMENT: {
          const component = document.createElement(
            loadingMechanism.elementName
          );
          component.id = 'dashboard'; // used in `_selectedDashboardComponent`
          container.appendChild(component);
          break;
        }
        case LoadingMechanismType.IFRAME: {
          this._renderPluginIframe(container, selectedDashboard);
          break;
        }
        default: {
          console.warn('Invariant violation:', loadingMechanism);
          break;
        }
      }
    }
    this.set('_isReloadDisabled', dashboard.disableReload);
  }
  _renderPluginIframe(container: Element, selectedDashboard: string) {
    const iframe = document.createElement('iframe');
    iframe.id = 'dashboard'; // used in `_selectedDashboardComponent`
    const srcUrl = new URL('data/plugin_entry.html', window.location.href);
    srcUrl.searchParams.set('name', selectedDashboard);
    iframe.setAttribute('src', srcUrl.toString());
    container.appendChild(iframe);
  }
  /**
   * Get the Polymer component corresponding to the currently
   * selected dashboard. For instance, the result might be an
   * instance of `<tf-scalar-dashboard>`.
   *
   * If the dashboard does not exist (e.g., the set of active
   * dashboards has not loaded or has failed to load, or the user
   * has selected a dashboard for which we have no implementation),
   * `null` is returned.
   */
  _selectedDashboardComponent() {
    const selectedDashboard = this._selectedDashboard;
    var dashboard = this.$$(
      `.dashboard-container[data-dashboard=${selectedDashboard}] #dashboard`
    );
    return dashboard;
  }
  ready() {
    super.ready();
    setUseHash(this.useHash);
    this._updateSelectedDashboardFromHash();
    window.addEventListener(
      'hashchange',
      () => {
        this._updateSelectedDashboardFromHash();
      },
      /*useCapture=*/ false
    );
    environmentStore.addListener(() => {
      this._dataLocation = environmentStore.getDataLocation();
      const title = environmentStore.getWindowTitle();
      if (title) {
        window.document.title = title;
      }
    });
    this._reloadData();
    this._lastReloadTime = new Date().toString();
  }

  @computed('_dashboardData', '_pluginsListing')
  get _activeDashboards() {
    if (!this._dashboardData) return [];
    return this._dashboardData
      .map((d) => d.plugin)
      .filter((dashboardName) => {
        // TODO(stephanwlee): Remove boolean code path when releasing
        // 2.0.
        // PluginsListing can be an object whose key is name of the
        // plugin and value is a boolean indicating whether if it is
        // enabled. This is deprecated but we will maintain backwards
        // compatibility for some time.
        const maybeMetadata = this._pluginsListing[dashboardName];
        if (typeof maybeMetadata === 'boolean') return maybeMetadata;
        return maybeMetadata && maybeMetadata.enabled;
      });
  }
  _onTemplateChanged() {
    // This will trigger an observer that kicks off everything.
    const dashboardContainersStamped: {
      [dashboardName: string]: boolean;
    } = {};
    const containers = this.root!.querySelectorAll('.dashboard-container');
    for (const container of Array.from(containers)) {
      const element = container as HTMLElement;
      dashboardContainersStamped[element.dataset.dashboard as string] = true;
    }
    this._dashboardContainersStamped = dashboardContainersStamped;
  }

  @computed('_pluginsListing')
  get _dashboardRegistry(): DashboardRegistry {
    var pluginsListing = this._pluginsListing;
    const registry: DashboardRegistry = {};
    for (const [name, legacyMetadata] of Object.entries(dashboardRegistry)) {
      registry[name] = {
        plugin: legacyMetadata.plugin,
        loadingMechanism: {
          type: LoadingMechanismType.CUSTOM_ELEMENT,
          elementName: legacyMetadata.elementName,
        },
        tabName: legacyMetadata.tabName.toUpperCase(),
        disableReload: legacyMetadata.isReloadDisabled || false,
        removeDom: (legacyMetadata as any).removeDom || false,
      };
    }
    if (pluginsListing != null) {
      for (const [name, backendMetadata] of Object.entries(pluginsListing)) {
        if (typeof backendMetadata === 'boolean') {
          // Legacy backend (prior to #2257). No metadata to speak of.
          continue;
        }
        let loadingMechanism: UiPluginMetadata['loadingMechanism'];
        switch (backendMetadata.loading_mechanism.type) {
          case LoadingMechanismType.NONE:
            // Legacy backend plugin.
            if (registry[name] == null) {
              console.warn(
                'Plugin has no loading mechanism and no baked-in registry entry: %s',
                name
              );
            }
            continue;
          case LoadingMechanismType.CUSTOM_ELEMENT:
            loadingMechanism = {
              type: LoadingMechanismType.CUSTOM_ELEMENT,
              elementName: backendMetadata.loading_mechanism
                .element_name as string,
            };
            break;
          case LoadingMechanismType.IFRAME:
            loadingMechanism = {
              type: LoadingMechanismType.IFRAME,
              modulePath: backendMetadata.loading_mechanism
                .module_path as string,
            };
            break;
          default:
            console.warn(
              'Unknown loading mechanism for plugin %s: %s',
              name,
              backendMetadata.loading_mechanism
            );
            continue;
        }
        if (loadingMechanism == null) {
          console.error(
            'Invariant violation: loadingMechanism is %s for %s',
            loadingMechanism,
            name
          );
        }
        registry[name] = {
          plugin: name,
          loadingMechanism: loadingMechanism,
          tabName: backendMetadata.tab_name.toUpperCase(),
          disableReload: backendMetadata.disable_reload,
          removeDom: backendMetadata.remove_dom,
        };
      }
    }
    // Reorder to list all values from the `/data/plugins_listing`
    // response first and in their listed order.
    const orderedRegistry: DashboardRegistry = {};
    for (const plugin of Object.keys(pluginsListing)) {
      if (registry[plugin]) {
        orderedRegistry[plugin] = registry[plugin];
      }
    }
    Object.assign(orderedRegistry, registry);
    return orderedRegistry;
  }

  @computed('_dashboardRegistry')
  get _dashboardData(): UiPluginMetadata[] {
    var dashboardRegistry = this._dashboardRegistry;
    return Object.values(dashboardRegistry);
  }

  _fetchPluginsListing() {
    this._canceller.cancelAll();
    const updatePluginsListing = this._canceller.cancellable((result) => {
      if (result.cancelled) {
        return;
      }
      this._pluginsListing = result.value as any;
      this._activeDashboardsLoadState = ActiveDashboardsLoadState.LOADED;
    });
    const onFailure = () => {
      if (
        this._activeDashboardsLoadState === ActiveDashboardsLoadState.NOT_LOADED
      ) {
        this._activeDashboardsLoadState = ActiveDashboardsLoadState.FAILED;
      } else {
        console.warn(
          'Failed to reload the set of active plugins; using old value.'
        );
      }
    };
    return this._requestManager
      .request(getRouter().pluginsListing())
      .then(updatePluginsListing, onFailure);
  }

  @computed('_activeDashboardsLoadState')
  get _activeDashboardsNotLoaded(): boolean {
    var state = this._activeDashboardsLoadState;
    return state === ActiveDashboardsLoadState.NOT_LOADED;
  }

  @computed('_activeDashboardsLoadState')
  get _activeDashboardsLoaded(): boolean {
    var state = this._activeDashboardsLoadState;
    return state === ActiveDashboardsLoadState.LOADED;
  }

  @computed('_activeDashboardsLoadState')
  get _activeDashboardsFailedToLoad(): boolean {
    var state = this._activeDashboardsLoadState;
    return state === ActiveDashboardsLoadState.FAILED;
  }

  @computed(
    '_activeDashboardsLoaded',
    '_activeDashboards',
    '_selectedDashboard'
  )
  get _showNoDashboardsMessage(): boolean {
    var loaded = this._activeDashboardsLoaded;
    var activeDashboards = this._activeDashboards;
    var selectedDashboard = this._selectedDashboard;
    return loaded && activeDashboards.length === 0 && selectedDashboard == null;
  }

  @computed(
    '_activeDashboardsLoaded',
    '_dashboardRegistry',
    '_selectedDashboard'
  )
  get _showNoSuchDashboardMessage(): boolean {
    var loaded = this._activeDashboardsLoaded;
    var registry = this._dashboardRegistry;
    var selectedDashboard = this._selectedDashboard;
    return loaded && !!selectedDashboard && registry[selectedDashboard] == null;
  }
  _updateRouter(router: Router) {
    setRouter(router);
  }
  _updateTitle(title: string) {
    if (title) {
      this.set('brand', title);
    }
  }
  reload() {
    if (this._isReloadDisabled) return;
    this._reloadData().then(() => {
      const dashboard = this._selectedDashboardComponent() as Dashboard | null;
      if (dashboard && dashboard.reload) dashboard.reload();
    });
    this._lastReloadTime = new Date().toString();
  }
  _reloadData() {
    this._refreshing = true;
    return Promise.all([
      this._fetchPluginsListing(),
      environmentStore.refresh(),
      runsStore.refresh(),
      experimentsStore.refresh(),
    ])
      .then(() => {
        this._lastReloadTimeShort = new Date().toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        });
      })
      .finally(() => {
        this._refreshing = false;
      });
  }
  _getDataRefreshingClass() {
    return this._refreshing ? 'refreshing' : '';
  }
  openSettings() {
    (this.$.settings as any).open();
    (this.$.paginationLimitInput as PaperInputElement).value = String(
      getLimit()
    );
  }
  _paginationLimitValidate(event: KeyboardEvent) {
    (event.target as PaperInputElement).validate();
  }
  _paginationLimitChanged(e: KeyboardEvent) {
    const value = Number.parseInt((e.target as HTMLInputElement).value, 10);
    // We set type="number" and min="1" on the input, but Polymer
    // doesn't actually enforce those, so we have to check manually.
    if (value === +value && value > 0) {
      setLimit(value);
    }
  }
}
