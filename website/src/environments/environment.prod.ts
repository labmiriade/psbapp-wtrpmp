import { Environment } from 'src/app/core/interfaces/environment.interface';

export const environment: Environment = {
  production: true,
  awsRegion: 'eu-west-1',
  awsIdentityPoolId: '<IDENTITYP_POOL_ID>',
  awsMapName: 'explore.map',
  baseUrl: '/api',
  siteKeyCaptcha: '<CAPTCHA_KEY>',
};
