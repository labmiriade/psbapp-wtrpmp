import Router from '@koa/router';
import { PlaceInfo } from '../entities';

const router = new Router({ prefix: '/p' });

export default router;

router.get('/:placeId', (ctx, next) => {
  const placeId = ctx.params.placeId;
  ctx.body = PlaceInfo(placeId);
});

router.put('/:placeId/like', (ctx, next) => {
  const placeId = ctx.params.placeId;
  ctx.body = PlaceInfo(placeId);
});

router.post('/', (ctx, next) => {
  ctx.status = 204;
});
