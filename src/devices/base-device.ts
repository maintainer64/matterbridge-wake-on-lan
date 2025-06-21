import { Matterbridge, MatterbridgeEndpoint } from 'matterbridge';
import { IMatterbridgeAccessory, IMatterbridgeDevice } from './interface.js';
import { AnsiLogger } from 'node-ansi-logger';

export abstract class BaseDevice implements IMatterbridgeDevice, IMatterbridgeAccessory {
  protected endpoint: MatterbridgeEndpoint | undefined;

  constructor(
    protected matterbridge: Matterbridge,
    protected log: AnsiLogger,
    protected name: string,
    protected serialNumber: string,
    protected debug: boolean,
  ) {}

  abstract initialize(): Promise<MatterbridgeEndpoint>;
  abstract configure(useInterval?: boolean): Promise<void>;
  abstract shutdown(): Promise<void>;

  getEndpoint(): MatterbridgeEndpoint {
    if (!this.endpoint) {
      throw new Error('Device not initialized');
    }
    return this.endpoint;
  }

  getName(): string {
    return this.name;
  }

  getSerialNumber(): string {
    return this.serialNumber;
  }
}
