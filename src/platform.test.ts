/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';
import path from 'node:path';
import { Matterbridge, PlatformConfig, MatterbridgeEndpoint, onOffSwitch, bridgedNode, powerSource } from 'matterbridge';
import { AnsiLogger, LogLevel, TimestampFormat } from 'matterbridge/logger';
import { ServerNode, Endpoint, LogLevel as Level, LogFormat as Format, MdnsService } from 'matterbridge/matter';
import { AggregatorEndpoint } from 'matterbridge/matter/endpoints';
import {
  ColorControlCluster,
  DoorLockCluster,
  FanControl,
  FanControlCluster,
  IdentifyCluster,
  LevelControlCluster,
  ModeSelectCluster,
  OnOffCluster,
  Thermostat,
  ThermostatCluster,
  WindowCovering,
  WindowCoveringCluster,
} from 'matterbridge/matter/clusters';

import { MatterbridgeWakOnLan } from './platform';
import { rmSync } from 'node:fs';

let loggerLogSpy: jest.SpiedFunction<typeof AnsiLogger.prototype.log>;
let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
let consoleDebugSpy: jest.SpiedFunction<typeof console.log>;
let consoleInfoSpy: jest.SpiedFunction<typeof console.log>;
let consoleWarnSpy: jest.SpiedFunction<typeof console.log>;
let consoleErrorSpy: jest.SpiedFunction<typeof console.log>;
const debug = false; // Set to true to enable debug logs

if (!debug) {
  loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log').mockImplementation((level: string, message: string, ...parameters: any[]) => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {});
  consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation((...args: any[]) => {});
  consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation((...args: any[]) => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: any[]) => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {});
} else {
  loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log');
  consoleLogSpy = jest.spyOn(console, 'log');
  consoleDebugSpy = jest.spyOn(console, 'debug');
  consoleInfoSpy = jest.spyOn(console, 'info');
  consoleWarnSpy = jest.spyOn(console, 'warn');
  consoleErrorSpy = jest.spyOn(console, 'error');
}

// Cleanup the matter environment
try {
  rmSync('jest', { recursive: true, force: true });
} catch (error) {
  //
}

describe('TestPlatform', () => {
  let matterbridge: Matterbridge;
  let server: ServerNode<ServerNode.RootEndpoint>;
  let aggregator: Endpoint<AggregatorEndpoint>;
  let device: MatterbridgeEndpoint;
  let dynamicPlatform: MatterbridgeWakOnLan;

  const mockLog = {
    fatal: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.fatal', message, parameters);
    }),
    error: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.error', message, parameters);
    }),
    warn: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.warn', message, parameters);
    }),
    notice: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.notice', message, parameters);
    }),
    info: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.info', message, parameters);
    }),
    debug: jest.fn((message: string, ...parameters: any[]) => {
      // console.log('mockLog.debug', message, parameters);
    }),
  } as unknown as AnsiLogger;

  const mockMatterbridge = {
    homeDirectory: 'jest',
    matterbridgeDirectory: path.join('jest', '.matterbridge'),
    matterbridgePluginDirectory: path.join('jest', 'Matterbridge'),
    systemInformation: {
      ipv4Address: undefined,
      ipv6Address: undefined,
      osRelease: 'xx.xx.xx.xx.xx.xx',
      nodeVersion: '22.1.10',
    },
    matterbridgeVersion: '3.0.5',
    enableRVC: true,
    log: mockLog,
    getDevices: jest.fn(() => {
      // console.log('getDevices called');
      return [];
    }),
    getPlugins: jest.fn(() => {
      // console.log('getDevices called');
      return [];
    }),
    addBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
      // console.log('addBridgedEndpoint called for server', server.construction.status, 'aggregator', aggregator.construction.status);
      // console.log('addBridgedEndpoint called with plugin', pluginName, 'device', device.deviceName, 'status', device.construction.status);
      await aggregator.add(device);
    }),
    removeBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
      // console.log('removeBridgedEndpoint called');
    }),
    removeAllBridgedEndpoints: jest.fn(async (pluginName: string) => {
      // console.log('removeAllBridgedEndpoints called');
    }),
  } as unknown as Matterbridge;

  const mockConfig = {
    name: 'matterbridge-wake-on-lan',
    type: 'DynamicPlatform',
    whiteList: [],
    blackList: [],
    wakeOnLan: [
      {
        id: '0x0001',
        name: '1',
        mac: '0a:d7:b2:97:42:f7',
        address: '24.51.207.6',
        port: '10',
      },
      {
        id: '0x0002',
        name: '2',
        mac: '0a:d7:b2:97:42:f7',
        address: '24.51.207.6',
        port: '10',
      },
    ],
    enableConcentrationMeasurements: true,
    enableRVC: true,
    debug: true,
    unregisterOnShutdown: false,
  } as PlatformConfig;

  beforeAll(async () => {
    // Create a MatterbridgeEdge instance
    matterbridge = await Matterbridge.loadInstance(false);
    matterbridge.matterbridgeDirectory = path.join('jest', '.matterbridge');
    matterbridge.matterbridgePluginDirectory = path.join('jest', 'Matterbridge');

    matterbridge.log = new AnsiLogger({
      logName: 'Matterbridge',
      logTimestampFormat: TimestampFormat.TIME_MILLIS,
      logLevel: LogLevel.DEBUG,
    });

    // Setup matter environment
    matterbridge.environment.vars.set('log.level', Level.NOTICE);
    matterbridge.environment.vars.set('log.format', Format.ANSI);
    matterbridge.environment.vars.set('path.root', path.join('jest', '.matterbridge', 'matterstorage'));
    matterbridge.environment.vars.set('runtime.signals', false);
    matterbridge.environment.vars.set('runtime.exitcode', false);
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Close the Matterbridge instance
    await matterbridge.destroyInstance();

    // Restore all mocks
    jest.restoreAllMocks();
  });

  it('should initialize matterbridge', () => {
    expect(matterbridge).toBeDefined();
  });

  it('should create the context', async () => {
    await (matterbridge as any).startMatterStorage();
    expect(matterbridge.matterStorageService).toBeDefined();
    expect(matterbridge.matterStorageManager).toBeDefined();
    expect(matterbridge.matterbridgeContext).toBeDefined();
  });

  it('should create the server', async () => {
    server = await (matterbridge as any).createServerNode(matterbridge.matterbridgeContext);
    expect(server).toBeDefined();
  });

  it('should create the aggregator', async () => {
    aggregator = await (matterbridge as any).createAggregatorNode(matterbridge.matterbridgeContext);
    expect(aggregator).toBeDefined();
  });

  it('should add the aggregator to the server', async () => {
    expect(await server.add(aggregator)).toBeDefined();
  });

  it('should add a device to the aggregator to the server', async () => {
    device = new MatterbridgeEndpoint([onOffSwitch, bridgedNode, powerSource], { uniqueStorageKey: 'Device' }, true);
    device.createDefaultBridgedDeviceBasicInformationClusterServer('Switch', '0x0001', 0xfff1, 'Matterbridge', 'Matterbridge Switch');
    device.addRequiredClusterServers();
    expect(await aggregator.add(device)).toBeDefined();
  });

  it('should throw error in load when version is not valid', () => {
    mockMatterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new MatterbridgeWakOnLan(mockMatterbridge, mockLog, mockConfig)).toThrow(
      'This plugin requires Matterbridge version >= "3.0.6". Please update Matterbridge from 1.5.0 to the latest version in the frontend.',
    );
    mockMatterbridge.matterbridgeVersion = '3.0.6';
  });

  it('should initialize platform with config name', () => {
    dynamicPlatform = new MatterbridgeWakOnLan(mockMatterbridge, mockLog, mockConfig);
    dynamicPlatform.version = '1.6.6';
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', mockConfig.name);
  });

  it('should call onStart with reason and add no devices', async () => {
    mockConfig.whiteList = ['No devices'];
    mockConfig.blackList = [];
    await dynamicPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
    expect(mockMatterbridge.addBridgedEndpoint).toHaveBeenCalledTimes(0);
  }, 60000);

  it('should call onShutdown with reason and cleanup the interval', async () => {
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(0);
  }, 60000);

  it('should call onStart with reason and add all the devices', async () => {
    mockConfig.whiteList = [];
    mockConfig.blackList = [];
    await dynamicPlatform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
    expect(mockMatterbridge.addBridgedEndpoint).toHaveBeenCalledTimes(2);
  }, 60000);

  it('should start the server', async () => {
    await (matterbridge as any).startServerNode(server);
    expect(server.lifecycle.isOnline).toBe(true);
  });

  it('should call onConfigure', async () => {
    expect(mockLog.info).toHaveBeenCalledTimes(0);
    expect(loggerLogSpy).toHaveBeenCalledTimes(0);

    consoleErrorSpy.mockRestore();

    jest.useFakeTimers();

    await dynamicPlatform.onConfigure();
    expect(mockLog.info).toHaveBeenCalledWith('onConfigure called');

    // Simulate multiple interval executions
    for (let i = 0; i < 100; i++) {
      jest.advanceTimersByTime(60 * 1000);
    }

    jest.useRealTimers();

    expect(mockLog.info).toHaveBeenCalledTimes(3);
    expect(mockLog.error).toHaveBeenCalledTimes(0);
    expect(loggerLogSpy).toHaveBeenCalledTimes(0);
  }, 60000);

  it('should call onShutdown with reason', async () => {
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(0);
  }, 60000);

  it('should call onShutdown with reason and remove the devices', async () => {
    mockConfig.unregisterOnShutdown = true;
    await dynamicPlatform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
    expect(mockMatterbridge.removeBridgedEndpoint).toHaveBeenCalledTimes(0);
    expect(mockMatterbridge.removeAllBridgedEndpoints).toHaveBeenCalledTimes(1);
  }, 60000);

  it('should stop the server', async () => {
    await server.close();
    expect(server.lifecycle.isOnline).toBe(false);
    await server.env.get(MdnsService)[Symbol.asyncDispose]();
  }, 60000);

  it('should stop the storage', async () => {
    await (matterbridge as any).stopMatterStorage();
    expect(matterbridge.matterStorageService).not.toBeDefined();
    expect(matterbridge.matterStorageManager).not.toBeDefined();
    expect(matterbridge.matterbridgeContext).not.toBeDefined();
  });
});
