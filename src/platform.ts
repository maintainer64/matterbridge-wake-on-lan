import { Matterbridge, MatterbridgeDynamicPlatform, PlatformConfig } from 'matterbridge';
import { IMatterbridgeDevice } from './devices/interface.js';
import { AnsiLogger } from 'node-ansi-logger';
import { ConfigPlugin } from './devices/config.js';
import { WakeOnLanDevice } from './devices/wakeOnLan.js';

export class MatterbridgeWakOnLan extends MatterbridgeDynamicPlatform {
  private devices: IMatterbridgeDevice[] = [];
  private configPlugin: ConfigPlugin;

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: ConfigPlugin) {
    super(matterbridge, log, config as PlatformConfig);
    this.configPlugin = config;
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.0.6')) {
      throw new Error(
        `This plugin requires Matterbridge version >= "3.0.6". Please update Matterbridge from ${this.matterbridge.matterbridgeVersion} to the latest version in the frontend.`,
      );
    }
    this.log.info('Initializing platform:', this.config.name);
    this.initializeDevices();
  }

  private initializeDevices() {
    // Добавляем устройства
    for (const device of this.configPlugin.wakeOnLan || []) {
      const wakeOnLanDevice = new WakeOnLanDevice(this.matterbridge, this.log, device.name, device.id, this.configPlugin.debug || false, device.mac, device.address, device.port);
      this.devices.push(wakeOnLanDevice);
    }
  }

  override async onStart(reason?: string) {
    this.log.info('onStart called with reason:', reason ?? 'none');
    await this.ready;
    await this.clearSelect();

    // Инициализируем все устройства
    for (const device of this.devices) {
      const endpoint = await device.initialize();
      if (this.validateDevice(endpoint.deviceName ?? '')) {
        await this.registerDevice(endpoint);
      }
    }
  }

  override async onConfigure() {
    await super.onConfigure();
    this.log.info('onConfigure called');

    // Конфигурируем все устройства
    for (const device of this.devices) {
      await device.configure();
    }
  }

  override async onShutdown(reason?: string) {
    // Выключаем все устройства
    for (const device of this.devices) {
      await device.shutdown();
    }

    await super.onShutdown(reason);
    this.log.info('onShutdown called with reason:', reason ?? 'none');

    if (this.configPlugin.unregisterOnShutdown === true) {
      await this.unregisterAllDevices(500);
    }
  }
}
