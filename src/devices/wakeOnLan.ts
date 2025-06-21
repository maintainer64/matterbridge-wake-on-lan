import { Matterbridge, MatterbridgeEndpoint, bridgedNode, onOffSwitch, powerSource } from 'matterbridge';
import { OnOff } from 'matterbridge/matter/clusters';
import wol from 'wake_on_lan';
import ping from 'ping';
import { BaseDevice } from './base-device.js';
import { AnsiLogger } from 'node-ansi-logger';

export class WakeOnLanDevice extends BaseDevice {
  private interval: NodeJS.Timeout | undefined;
  private intervalOnOff = false;

  constructor(
    matterbridge: Matterbridge,
    log: AnsiLogger,
    name: string,
    serialNumber: string,
    debug: boolean,
    public mac?: string,
    public address?: string,
    public port?: number,
  ) {
    super(matterbridge, log, name, serialNumber, debug);
  }

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
      .createDefaultPowerSourceRechargeableBatteryClusterServer(100);

    this.endpoint.addCommandHandler('on', async () => {
      await this.endpoint?.setAttribute(OnOff.Cluster.id, 'onOff', true, this.log);
      wol.wake(this.mac ?? '', {
        address: this.address || '255.255.255.255',
        port: this.port || 9,
        interval: 500,
        num_packets: 5,
      });
    });

    this.endpoint.addCommandHandler('off', async () => {
      await this.endpoint?.setAttribute(OnOff.Cluster.id, 'onOff', false, this.log);
    });

    return this.endpoint;
  }

  async getStatus(): Promise<void> {
    const res = await ping.promise.probe(this.address ?? '255.255.255.255');
    this.intervalOnOff = res?.alive === true;
    await this.endpoint?.setAttribute(OnOff.Cluster.id, 'onOff', this.intervalOnOff, this.log);
  }

  async configure(): Promise<void> {
    await this.getStatus();
    this.interval = setInterval(
      async () => {
        await this.getStatus();
      },
      60 * 1000 + 100,
    );
  }

  async shutdown(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
