import {State as CoreState} from './core/store/core_types';
import {State as FeatureFlagState} from './feature_flag/store/feature_flag_types';

// Allows partial features in a given state.
export type State = CoreState & FeatureFlagState;

export type StateForTesting = Partial<State>;
