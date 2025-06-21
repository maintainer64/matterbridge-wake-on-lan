/**
 * Конфигурация Wake-on-LAN устройства
 */
export interface WakeOnLanDeviceConfig {
  /** Удобное имя устройства */
  name: string;
  /** Уникальный идентификатор устройства в формате 0xXXXX */
  id: string;
  /** MAC-адрес в формате XX:XX:XX:XX:XX:XX */
  mac: string;
  /** IPv4 адрес (опционально, для ARP ping) */
  address?: string;
  /** Порт (по умолчанию 9) */
  port?: number;
}

/**
 * Основная конфигурация плагина Matterbridge Somfy Tahoma
 */
export interface ConfigPlugin {
  /** Имя плагина (readonly) */
  name?: string;
  /** Тип плагина (readonly) */
  type?: string;
  /** Только устройства из списка будут экспортированы */
  whiteList?: string[];
  /** Устройства из списка не будут экспортированы */
  blackList?: string[];
  /** Использовать интервал для обновления устройств */
  useInterval?: boolean;
  /** Включить поддержку робота-пылесоса */
  enableRVC?: boolean;
  /** Режим отладки (только для разработки) */
  debug?: boolean;
  /** Отменить регистрацию всех устройств при выключении (только для разработки) */
  unregisterOnShutdown?: boolean;
  /** Конфигурация Wake-on-LAN устройств */
  wakeOnLan?: WakeOnLanDeviceConfig[];
}
