import { createReducer, on } from '@ngrx/store';
import { PlaceInfo } from 'src/app/core/interfaces/api.interface';
import {
  like,
  likeFailed,
  likeSuccess,
  search,
  searchById,
  searchFailed,
  searchFailedById,
  searchSuccess,
  searchSuccessById,
} from '../actions/main.actions';

export interface Keywords {
  key: string;

  geo?: GeolocationPosition;
}

export interface State {
  loading: boolean;
  loadingLike: boolean;
  keywords: Keywords;
  error: any;
  results: PlaceInfo[] | null;
  result: PlaceInfo | undefined;
}

const initialState: State = {
  loading: false,
  loadingLike: false,
  keywords: { key: '' },
  error: null,
  results: null,
  result: undefined,
};

export const reducer = createReducer(
  initialState,
  on(search, (state, props) => ({
    ...state,
    loading: true,
    keywords:
      props.near && props.cat
        ? { key: props.q, geo: props.near, cat: props.cat }
        : props.near && !props.cat
        ? { key: props.q, geo: props.near }
        : !props.near && props.cat
        ? { key: props.q, cat: props.cat }
        : { key: props.q },
  })),
  on(searchSuccess, (state, props) => ({
    ...state,
    loading: false,
    results: props.results,
  })),
  on(searchFailed, (state, props) => ({
    ...state,
    loading: false,
    error: props.error,
    results: null,
  })),
  on(searchById, (state, props) => ({
    ...state,
    loading: true,
  })),
  on(searchSuccessById, (state, props) => ({
    ...state,
    loading: false,
    result: props.result,
  })),
  on(searchFailedById, (state, props) => ({
    ...state,
    loading: false,
    error: props.error,
    result: undefined,
  })),
  on(like, (state, props) => ({
    ...state,
    loadingLike: true,
  })),
  on(likeSuccess, (state, props) => ({
    ...state,
    loadingLike: false,
    results: updateLikes(state.results, props.result),
    result:
      state.result?.placeId === props.result.placeId ? { ...state.result, likes: props.result.likes } : state.result,
  })),
  on(likeFailed, (state, props) => ({
    ...state,
    loadingLike: false,
    error: props.error,
  })),
);

const updateLikes = (places: PlaceInfo[] | null, result: PlaceInfo) => {
  return places
    ? places.map((place) => (place.placeId === result.placeId ? { ...place, likes: result.likes } : place))
    : null;
};
