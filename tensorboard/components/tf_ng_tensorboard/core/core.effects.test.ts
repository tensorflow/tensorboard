import {TestBed} from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {Actions} from '@ngrx/effects';
import {Action} from '@ngrx/store';
import {provideMockActions} from '@ngrx/effects/testing';
import {ReplaySubject} from 'rxjs';

import {CoreEffects} from './core.effects';
import * as coreActions from './core.actions';
import {CoreService} from './core.service';
import {PluginsListing} from '../types/api';

import * as _typeHackEffects from '@ngrx/effects';
import * as _typeHackStore from '@ngrx/store';

describe('core.effects', () => {
  let httpMock: HttpTestingController;
  let coreEffects: CoreEffects;
  let action: ReplaySubject<Action>;

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideMockActions(action), CoreEffects, CoreService],
    }).compileComponents();
    coreEffects = TestBed.get<CoreEffects>(CoreEffects);
    httpMock = TestBed.get(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches plugins listing and fires success action', () => {
    const pluginsListing: PluginsListing = {
      core: {
        disable_reload: false,
        enabled: true,
        loading_mechanism: {
          type: 'NONE',
        },
        tab_name: 'Core',
        remove_dom: false,
      },
    };

    // Assertion/exception in the subscribe does not fail the test.
    // Restore the result
    let res = null;
    const promise = coreEffects.loadPluginsListing$.subscribe((action) => {
      res = action;
    });
    action.next(coreActions.coreLoaded());
    // Flushing the request response invokes above subscription sychronously.
    httpMock.expectOne('data/plugins_listing').flush(pluginsListing);

    expect(res).toEqual(
      coreActions.pluginsListingLoaded({plugins: pluginsListing})
    );
  });
});
