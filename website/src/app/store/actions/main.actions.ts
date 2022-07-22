import { createAction, props } from '@ngrx/store';
import { PlaceInfo } from 'src/app/core/interfaces/api.interface';

export const search = createAction('[Main] Search', props<{ q: string; near?: GeolocationPosition; cat?: string }>());
export const searchSuccess = createAction('[Main] Search Success', props<{ results: PlaceInfo[] }>());
export const searchFailed = createAction('[Main] Search Failed', props<{ error: any }>());

export const searchById = createAction('[Main] Search by Id', props<{ placeId: string }>());
export const searchSuccessById = createAction('[Main] Search Success by Id', props<{ result: PlaceInfo }>());
export const searchFailedById = createAction('[Main] Search Failed by Id', props<{ error: any; placeId: string }>());

export const like = createAction('[Main] Like', props<{ id: string }>());
export const likeSuccess = createAction('[Main] Like Success', props<{ result: PlaceInfo }>());
export const likeFailed = createAction('[Main] Like Failed', props<{ error: any }>());
