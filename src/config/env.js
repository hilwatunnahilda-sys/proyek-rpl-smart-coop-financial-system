/**
 * Environment Configuration Loader & Validator
 * Provides typed, immutable application settings
 */

const envSource = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

export const ENV = Object.freeze({
  APP_NAME: envSource.VITE_APP_NAME || 'Smart Co-op Financial System',
  APP_ENV: envSource.VITE_APP_ENV || 'development',
  APP_VERSION: envSource.VITE_APP_VERSION || '1.0.0',
  INSTITUTION: envSource.VITE_APP_INSTITUTION || 'STMIK IKMI Cirebon',
  BASE_URL: envSource.VITE_APP_BASE_URL || 'http://localhost:3000',

  DATABASE: Object.freeze({
    DRIVER: envSource.VITE_DB_DRIVER || 'indexeddb',
    NAME: envSource.VITE_DB_NAME || 'ikmi_smart_coop_db',
    VERSION: parseInt(envSource.VITE_DB_VERSION || '1', 10),
    AUTO_SEED: envSource.VITE_DB_AUTO_SEED === 'true' || true,
    HOST: envSource.VITE_DB_HOST || 'localhost',
    PORT: parseInt(envSource.VITE_DB_PORT || '5432', 10),
  }),

  AUTH: Object.freeze({
    SESSION_KEY: envSource.VITE_AUTH_SESSION_KEY || 'ikmi_coop_session',
    ENABLE_AUDIT_LOG: envSource.VITE_ENABLE_AUDIT_LOG === 'true' || true,
  }),

  isDev: () => (envSource.VITE_APP_ENV || 'development') === 'development',
  isProd: () => envSource.VITE_APP_ENV === 'production',
});
