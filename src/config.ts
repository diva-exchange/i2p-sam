/**
 * MIT License - Copyright (c) 2021 diva.exchange
 *
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

import { nanoid } from 'nanoid';

const DEFAULT_LENGTH_SESSION = 16;

type tSession = {
  id?: string;
};

type tStream = {
  destination: string;
  silent?: boolean;
  onData?: Function;
};

type tForward = {
  host: string;
  port: number;
  silent?: boolean;
};

type tListen = {
  address: string;
  port: number;
  hostForward?: string;
  portForward?: number;
  onData?: Function;
};

type tSam = {
  host: string;
  portTCP: number;
  portUDP?: number;
  versionMin?: string;
  versionMax?: string;
  publicKey?: string;
  privateKey?: string;
};

export type Configuration = {
  session?: tSession;
  stream?: tStream;
  forward?: tForward;
  listen?: tListen;
  sam?: tSam;
};

type ConfigurationDefault = {
  session: tSession;
  stream: tStream;
  forward: tForward;
  listen: tListen;
  sam: tSam;
};

const DEFAULT_CONFIGURATION: ConfigurationDefault = {
  session: {
    id: '',
  },
  stream: {
    destination: '',
    silent: false,
  },
  forward: {
    host: '',
    port: 0,
    silent: false,
  },
  listen: {
    address: '127.0.0.1',
    port: 0,
    hostForward: '',
    portForward: 0,
  },
  sam: {
    host: '127.0.0.1',
    portTCP: 7656,
    portUDP: 7655,
    versionMin: '',
    versionMax: '',
    publicKey: '',
    privateKey: '',
  },
};

export class Config {
  public session: tSession;
  public forward: tForward;
  public stream: tStream;
  public listen: tListen;
  public sam: tSam;

  constructor(c: Configuration) {
    this.session = { ...DEFAULT_CONFIGURATION.session, ...(c.session || {}) };
    this.session.id = this.session.id || nanoid(DEFAULT_LENGTH_SESSION);
    this.stream = { ...DEFAULT_CONFIGURATION.stream, ...(c.stream || {}) };
    this.forward = { ...DEFAULT_CONFIGURATION.forward, ...(c.forward || {}) };
    this.forward.port = Number(this.forward.port) > 0 ? Config.port(Number(this.forward.port)) : 0;
    this.listen = { ...DEFAULT_CONFIGURATION.listen, ...(c.listen || {}) };
    this.listen.port = Number(this.listen.port) > 0 ? Config.port(Number(this.listen.port)) : 0;
    this.listen.hostForward = this.listen.hostForward || this.listen.address;
    this.listen.portForward =
      Number(this.listen.portForward) > 0 ? Config.port(Number(this.listen.portForward)) : this.listen.port;
    this.sam = { ...DEFAULT_CONFIGURATION.sam, ...(c.sam || {}) };
    this.sam.portTCP = Config.port(this.sam.portTCP);
    this.sam.portUDP = Number(this.sam.portUDP) > 0 ? Config.port(Number(this.sam.portUDP)) : 0;
  }

  private static b(n: any, min: number, max: number): number {
    n = Number(n);
    min = Math.floor(min);
    max = Math.ceil(max);
    return n >= min && n <= max ? Math.floor(n) : n > max ? max : min;
  }

  private static port(n: number): number {
    return Config.b(n, 1025, 65535);
  }
}
