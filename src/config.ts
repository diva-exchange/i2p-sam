/**
 * Copyright 2021-2025 diva.exchange
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Author/Maintainer: DIVA.EXCHANGE Association, https://diva.exchange
 */

import { nanoid } from 'nanoid';

export const MIN_UDP_MESSAGE_LENGTH: number = 1; // SAM v3 specs
export const MAX_UDP_MESSAGE_LENGTH: number = 16384; // SAM v3 specs says 32768, but that's too high, setting to 16K

const DEFAULT_LENGTH_SESSION: number = 16;

type tSession = {
  id?: string;
  options?: string;
};

type tStream = {
  destination: string;
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
};

type tSam = {
  host: string;
  portTCP: number;
  portUDP?: number;
  versionMin?: string;
  versionMax?: string;
  publicKey?: string;
  privateKey?: string;
  timeout?: number;
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
    options: '',
  },
  stream: {
    destination: '',
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
    timeout: 300,
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

  private static b(n: number | string, min: number, max: number): number {
    n = Number(n);
    min = Math.floor(min);
    max = Math.ceil(max);
    return n >= min && n <= max ? Math.floor(n) : n > max ? max : min;
  }

  private static port(n: number): number {
    return Config.b(n, 1025, 65535);
  }
}
