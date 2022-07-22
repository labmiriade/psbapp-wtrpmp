import { Environment } from 'src/app/core/interfaces/environment.interface';

export const environment: Environment = {
  production: true,
  awsRegion: 'eu-west-1',
  awsIdentityPoolId: '<IDENTITY_POOL_ID>',
  awsMapName: 'explore.map',
  baseUrl: '/api',
  siteKeyCaptcha: '<CAPTCHA_KEY>',
  awsPinpoint: {
    region: 'eu-west-1',
    identityPoolId: '<IDENTITY_POOL_ID>',
    appId: '<APP_ID>',
  },
};
