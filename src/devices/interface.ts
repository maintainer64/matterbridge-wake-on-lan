import { MatterbridgeEndpoint } from 'matterbridge';

export interface IMatterbridgeDevice {
  initialize(): Promise<MatterbridgeEndpoint>;

  configure(): Promise<void>;

  shutdown(): Promise<void>;
}

export interface IMatterbridgeAccessory {
  getEndpoint(): MatterbridgeEndpoint;

  getName(): string;

  getSerialNumber(): string;
}
