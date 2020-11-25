# Route Namespaced State

@stephanwlee, 2020-02-18

**Status:** Implemented.

## Background

One of the most critical concepts of TensorBoard is a `run`. The `run` is an
arbitrary unit of execution(s) that comprises a trial of an idea. A collection
of runs is called `experiment` and it generally involves varying dimensions
(e.g., hyper parameters). TensorBoard, circa. 2019, did not have a notion of
experiments and lacked UI affordance around it. Users, to work around, used
spreadsheets to track experiments over time.

TensorBoard will gain an ability to see a page with a list of experiments. It
will also have an ability to compare and contrast multiple experiments in a
dashboard. One of the design goals of the experiments list and runs selector is
to make find, filter, and select runs you care about, which can span across
multiple experiments; e.g., state-of-the-art of model foo, easy. This means that
the user should be able to weave through experiments list and dashboard view
easily.

## Problem Statement

Imagine following use case:

1.  user selects experiment A and experiment B, then compare
2.  in the exp A + exp B dashboard view, a user selects runs a1, a2, and b4
3.  user goes back to the experiments list and select exp A and exp C, and then
    compare
4.  user expects runs a1 and a2 **not** to be selected (can be convinced that
    this is the right thing)
5.  user, for comparing exp A and exp C, selects a1, a3, and c5
6.  user goes back to the experiments list and select exp A and exp B and
    expects runs a1, a2, and b4 to be selected (but not a3)

Today, for instance, the runs selection is keyed only by experiment id + run
name that any selection you make in any compare route will change others.

In the above user flow, it is clear that we need to remember the run selection
state for comparing exp A + exp B separate from that of exp A + exp C. Likewise,
we would like certain UI configurations such as sort and filter settings to be
remembered separately. Do note that this design is not asserting that this is a
catch-all solution that needs to be applied to every state in the reducers. For
instance, we will not want to namespace data fetches from the backend which,
mostly, are immutable and do not change based on the routes.

When designing the reducers, we did not account for this fact (not an oversight;
we did so to design incrementally) and remember only one set of runs selection
(see RunsUiState in runs/store/runs_types.ts). This document will detail a
design that can namespace a few UI states by routes.

Note that this problem is specific to TensorBoard being a Single Page App.

## Goal and Non-Goal

#### Goal

*   Design a way to store UI states in a namespaced fashion
*   Code complexity should not go up too high

#### Non-Goal

*   experiment metadata, run metadata, and time series values should not be
    namespaced
*   generic framework or factory for creating the namespace (this can be added
    later when there are more instances of namespaced UI states)

## Design

### Namespace

Given the use cases, an identifier derived from the route is a natural choice
for the namespace. For instance, we want the identifier for persisting runs
selections from exp A to be different for /experiment/expA vs.
/multiExperimentRoute/expA+expB (hypothetical routes for illustration). The
identifier is defined as,

```ts
// Pseudo-code: only the experimentId(s) part of the routeParams will be
// serialized.
function getNamespace(routeKind: RouteKind, routeParams: Params): string {
  return `${routeKind}/${JSON.stringify(routeParams)}`;
}
```

### Reducer Shape

UI states will need to be keyed by a namespace like below.

```ts
/**
 * Interface that describes shape of the `ui` state in the runs feature.
 */
export interface RunsUiState {
  notNamespacedState: string;
  namespaced: {
    [namespace: string]: {
      selectionState: {[runId: string]: boolean};
      paginationOption: {pageIndex: number; pageSize: number};
      regexFilter: string;
      sort: {column: string | null; direction: SortDirection};
    };
  };
}
```

Above shape predicates being able to either compute the namespace or attain one
from the action payload. Former is architecturally infeasible since it needs to
peek into route state from another reducer (another feature, too).

### Selector

Selector<sup>1</sup> is the perfect place to hide the complexity of the
namespaced state shape from the view and effects. See below example:

**Before**

```ts
export const getRunSelectionMap = createSelector(
  getRunsState,
  (state): {[runId: string]: boolean} => {
    return state.ui.selectionState || {};
  }
);
```

**After**

```ts
import {getNamespace} from '../app_routing/some_module';

// getNamespace looks roughly like below.
/*
export const getNamespace = createSelector(
    getRouteKind,
    getRouteParams,
    (kind, param) => {
      switch (kind) {
        case RouteKind.COMPARE_EXPERIMENT:
          return `ce/${(param as CompareRouteParams).experimentIds}`;
        case RouteKind.EXPERIMENT:
          return `e/${(param as ExperimentRouteParams).experimentId}`;
        default:
          return `${kind}`;
      }
    },
);
*/

const getNamespacedUiOptions = createSelector(
  getRunsState,
  getNamespace,
  (state, namespace) => {
    return state.ui.namespaced[namespace] || {};
  }
);

/**
 * Returns Observable that emits selection state of runs.
 */
export const getRunSelectionMap = createSelector(
  getNamespacedUiOptions,
  (option): {[runId: string]: boolean} => {
    return option.selectionState || {};
  }
);
```

Note that `getRunSelectionMap` and its API did not change and the complexity of
the store is transparent to the view.

### Make states stateful

Googlers, see reference implementation: cl/302108383

We can use actions fired by the router with a utility to change a state in the
reducer, so the route-ful part is managed.

*   Pro
    *   Complexity mostly is encapsulated in the utility
    *   Less code changes
*   Con
    *   Opaque (when using utility) or complex route related state progress
        (when not using utility) in the store
        *   i.e., in the implementation below, you will see duplicate
            `RoutefulState` on `FullState` and one under
            `privateRouteContextedState.`One on the `fullState` is a more recent
            one.

The idea is following:

*   As in the [Reducer shape section](#Reducer-shape), the reducer state will
    have an object (will be referred to as the 'Cache') whose values are the
    route-ful state and keyed by opaque route Id.
*   The route-ful state will be also present as part of the State
*   Leveraging the router state in the Navigation action payload, we can form a
    `routeId`
*   Using the `routeId`, we can identify which value from the Cache to move to
    State
*   Using "will navigate" action, we can save current route-ful state in State
    to the Cache

Please refer to below implementation for details:

```ts
type RoutefulStateWithContext<RoutefulState> = RoutefulState & {
  privateRouteContextedState: {[routeId: string]: RoutefulState};
};

export type RouteContextedState<
  RoutefulState extends object,
  NonRoutefulState extends object
> = NonRoutefulState & RoutefulStateWithContext<RoutefulState>;

export function createRouteContextedState<
  RoutefulState extends object,
  NonRoutefulState extends object
>(
  buildRoutefulInitialState: () => RoutefulState
): {
  initialState: RoutefulStateWithContext<RoutefulState>;
  reducers: On<RouteContextedState<RoutefulState, NonRoutefulState>>[];
} {
  type RoutefulFullState = RouteContextedState<RoutefulState, NonRoutefulState>;
  const initialState = buildRoutefulInitialState();
  const propKeys = Object.keys(initialState) as Array<keyof initialState>;

  return {
    initialState: {
      ...routefulInitialState,
      privateRouteContextedState: {},
    },
    reducers: [
      on<typeof routeRuqestActionCreator, RoutefulFullState>(
        routeRuqestActionCreator,
        (state, action) => {
          const {kind, params} = action.payload.routerState;
          const routeId = getRouteId(kind, params);
          const currContextedState = {};
          propKeys.forEach((key) => (currContextedState[key] = state[key]));

          return {
            ...state,
            privateRouteContextedState: {
              ...state.privateRouteContextedState,
              [routeId]: currContextedState,
            },
          };
        }
      ),
      // Note that route does not really change in case of error so we do not
      // need to explicitly handle the error.
      on<typeof routeNavigatedActionCreator, RoutefulFullState>(
        routeNavigatedActionCreator,
        (state, action) => {
          const {kind, params} = action.payload.routerState;
          const routeId = getRouteId(kind, params);
          const nextContextedState =
            state.privateRouteContextedState[routeId] ||
            buildRoutefulInitialState();

          return {
            ...state,
            ...nextContextedState,
          };
        }
      ),
    ],
  };
}
```

On the consumer side, it looks like below:

```ts
interface RoutefulRunUiState {
  selectionState: {};
  regexFilter: string;
}

interface NonRoutefulRunUiState {
  activeRun: RunId | null;
}

type RunsUiState = RouteContextedState<
  RoutefulRunUiState,
  NonRoutefulRunUiState
>;

const routefulStore = createRouteContextedState<
  RoutefulRunUiState,
  NonRoutefulRunUiState
>(() => ({
  selectionState: {},
  regexFilter: '',
}));

const initialState = {
  activeRun: null,
} as NonRoutefulRunUiState;

const uiReducer: ActionReducer<RunsUiState, Action> = createReducer(
  {
    ...initialState,
    ...routefulStore.initialState,
  } as RunsUiState,

  ...routefulStore.reducers,
  // Real implementation of UiState reducers are omitted for brevity
  on(runsActions.runSelectionToggled, (s) => s)
);
```

## Alternative Considered

### Action Translation

At very high-level, this design wants to translate route-context-less action
payload to one with route-ful one.

*   Pro
    *   Very conventional pattern for action, effects, and reducer
        *   reducer shape reflects the route context
*   Con
    *   Must ignore the original action A and remember only to use route-ful A'
        for correctness
    *   An effect needs to make mechanical translation of A to A' (can create
        utility for this)

##### Action Payload

Before delving into this topic, it is worth repeating our principles:

*   **Nature of action**: Actions are not fired with the intention of a
    side-effect. It fires an event that describes the user's intent. It is the
    reducers' job to interpret the intention and turn that into side-effects.
*   **Separation of concern**: View should not know about quirks of Store. Store
    should not know about View logic.

There are roughly two options to populate the identifier.

**Options:**

1.  view can pass the `routeId` in the action payload
2.  effects (middleware) can transform action A to A' (e.g.,
    `runSelectionToggled({runId: string})` to
    `routeContextedRunSelectionToggled({runId: string; routeId: string})`)

Option 1 is less than ideal because it violates both of our
principles--`routeId` does not capture the user's intention and it is just a
store complexity leaking out to the view. Option 2 is a cleaner and more sound
choice except it can feel tedious.

##### Effects

(based on option #2 in Action Payload)

Lastly, with the selector change, we can now make the changes to the effects.
One of the functions of an effect is to map an action to another action. We
should be able to convert route-context-less action to route-full action by
doing below.

```ts
/** @export */
attachRouteContext$ = createEffect(() =>
  this.actions$.pipe(
    ofType(
      actions.runSelectionToggled,
      actions.runPageSelectionToggled,
      actions.runsSelectAll,
      actions.runSelectorPaginationOptionChanged,
      actions.runSelectorSortChanged,
      actions.runSelectorRegexFilterChanged
    ),
    withLatestFrom(this.store.select(getRunsUiNamespace)),
    map(([action, routeId]) => {
      switch (action.type) {
        case actions.runSelectionToggled.type:
          return actions.routeContextedRunSelectionToggled({
            ...action,
            routeId,
          });
        case actions.runPageSelectionToggled.type:
          return actions.routeContextedRunPageSelectionToggled({
            ...action,
            routeId,
          });
        case actions.runsSelectAll.type:
          return actions.routeContextedRunsSelectAll({
            ...action,
            routeId,
          });
        case actions.runSelectorPaginationOptionChanged.type:
          return actions.routeContextedRunSelectorPaginationOptionChanged({
            ...action,
            routeId,
          });
        case actions.runSelectorSortChanged.type:
          return actions.routeContextedRunSelectorSortChanged({
            ...action,
            routeId,
          });
        case actions.runSelectorRegexFilterChanged.type:
          return actions.routeContextedRunSelectorRegexFilterChanged({
            ...action,
            routeId,
          });
        default:
          throw new Error('Not implemented');
      }
    })
  )
);
```

### Route context as framework

Up to now, we only considered approaches that are very architecturally
pure<sup>2</sup>. Here, we are recognizing that a route context is a notion that
pervades so many parts of the application that we need to break out of pattern
and use a bit more advanced features of Redux.

#### A: Use MetaReducer to inject the route information

MetaReducer like our debug logger (see reducer_config.ts) has access to the
entire State and all actions. We can use it to inject additional information to
all action payloads.

*   Pro
    *   Less code changes
*   Con
    *   Breaking out of pattern: harder to reason
    *   May enumerate all the action types that require this additional route id

#### B: Wrapper for `store.dispatch` and `createAction`: `store.dispatchRoutefulAction` and `createRoutefulAction`

Our wrapper for @ngrx/store can add an additional method,
`dispatchRoutefulAction` that takes the routeId from the store when dispatching
an action.

*   Pro
    *   Very easy to implement
*   Con
    *   Wrapper for the store
    *   View now knows that certain states are route-ful

### Route based unique run ID

`runId` is an opaque unique identifier of a run from the backend. We can prefix
it by `routeId`.

*   Pro: reducer shape is simpler
*   Con: UI will need to pass the right identifiers when reading states and when
    firing actions
    *   e.g., `getRuns` will have to return the prefixed identifier and make it
        route contextual.
*   Con: the run ID now cannot be passed as the request parameter without
    removing the identifier

## Notes

\[1] Since selectors are compositional pure functions that return sub-sections
from an applicational state and it is possible to read and filter down by
reading multiple sub-trees (i.e., `fn(a, b, …, z) -> output`) including
features.

\[2] It depends on the perspective. Here, we define it as a Redux pattern that a
conventional client application follows; simple Action -> Store -> View.
