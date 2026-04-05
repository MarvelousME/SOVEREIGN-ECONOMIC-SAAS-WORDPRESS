import config from './index';

export const keycloakConfig = {
  realm: config.keycloak.realm,
  'auth-server-url': config.keycloak.url,
  'ssl-required': 'external',
  resource: config.keycloak.clientId,
  credentials: {
    secret: config.keycloak.clientSecret,
  },
  'confidential-port': 0,
  'bearer-only': true,
};

export const keycloakAdminConfig = {
  baseUrl: config.keycloak.url,
  realmName: config.keycloak.realm,
  requestConfig: {
    timeout: 30000,
  },
};

export default keycloakConfig;
