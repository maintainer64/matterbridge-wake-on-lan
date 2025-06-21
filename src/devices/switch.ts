import { MatterbridgeEndpoint, bridgedNode, onOffSwitch, powerSource } from 'matterbridge';
import { BaseDevice } from './base-device.js';
import { OnOff } from 'matterbridge/matter/clusters';

export class SwitchDevice extends BaseDevice {
  private interval: NodeJS.Timeout | undefined;
  private intervalOnOff = false;

  async initialize(): Promise<MatterbridgeEndpoint> {
    this.endpoint = new MatterbridgeEndpoint([onOffSwitch, bridgedNode, powerSource], { uniqueStorageKey: this.name }, this.debug)
      .createDefaultIdentifyClusterServer()
      .createDefaultGroupsClusterServer()
      .createDefaultBridgedDeviceBasicInformationClusterServer(
        this.name,
        this.serialNumber,
        0xfff1,
        'Matterbridge',
        'Matterbridge Switch',
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
        parseInt(this.matterbridge.matterbridgeVersion.replace(/\D/g, '')),
        this.matterbridge.matterbridgeVersion,
      )
      .createDefaultOnOffClusterServer()
      .createDefaultPowerSourceRechargeableBatteryClusterServer(70);

    this.endpoint.addCommandHandler('identify', async ({ request: { identifyTime } }) => {
      this.log.info(`Command identify called identifyTime:${identifyTime}`);
    });

    this.endpoint.addCommandHandler('on', async () => {
      await this.endpoint?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.log);
      this.log.info('Command on called');
    });

    this.endpoint.addCommandHandler('off', async () => {
      await this.endpoint?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.log);
      this.log.info('Command off called');
    });

    return this.endpoint;
  }

  async configure(): Promise<void> {
    await this.endpoint?.setAttribute(OnOff.Cluster.id, 'onOff', this.intervalOnOff, this.log);
    this.log.info(`Set switch initial onOff to ${this.intervalOnOff}`);
  }

  async shutdown(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
