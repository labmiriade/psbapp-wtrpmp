import Router from '@koa/router';
import { PlaceAddress, PlaceCoordinates, PlaceList } from '../entities';

const router = new Router({ prefix: '/search' });

export default router;

router.get('/p', (ctx, next) => {
  const q = ctx.request.query.q;
  if (q === null || q === undefined) {
    ctx.throw(400, 'missing query param: q');
    return;
  }
  ctx.body = PlaceList();
});

router.get('/location/position', (ctx, next) => {
  ctx.body = PlaceAddress();
});

router.get('/location/text', (ctx, next) => {
  ctx.body = PlaceCoordinates();
});
