/**
 * Глобальная конфигурация фронтенда.
 * Для GitHub Pages оставьте apiBase пустым или укажите URL бэкенда после деплоя.
 */
(function () {
  window.INSTRUCTOR = {
    /** Базовый URL API (например https://api.example.com/v1). Пустая строка — только моки на клиенте. */
    apiBase: typeof window.__INSTRUCTOR_API_BASE__ !== 'undefined'
      ? window.__INSTRUCTOR_API_BASE__
      : '',
    /** Версия для кэша статики (опционально) */
    /** Меняйте при обновлении demo.json / картинок — сбрасывает кэш у клиентов */
    appVersion: '0.2.0-demo-steps',
    /** Пути для будущих эндпоинтов (используйте в fetch после появления бэкенда) */
    endpoints: {
      instructions: '/instructions',
      upload: '/instructions/upload',
      analytics: '/analytics/events',
      missingParts: '/reports/missing-parts',
      /** Админка завода (после бэкенда) */
      adminDashboard: '/admin/dashboard',
      adminModels: '/admin/models',
      adminRequests: '/admin/requests',
      adminSubscription: '/admin/subscription',
    },
  };
})();
