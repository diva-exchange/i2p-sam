/**
 * Copyright (C) 2021 diva.exchange
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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
  onMessage?: Function;
  onClose?: Function;
};

type tListen = {
  address: string;
  port: number;
  hostForward?: string;
  portForward?: number;
  onMessage?: Function;
  onClose?: Function;
};

type tSam = {
  host: string;
  portTCP: number;
  portUDP?: number;
  versionMin?: string;
  versionMax?: string;
  publicKey?: string;
  privateKey?: string;
  onClose?: Function;
};

export type Configuration = {
  session?: tSession;
  stream?: tStream;
  listen?: tListen;
  sam?: tSam;
};

type ConfigurationDefault = {
  session: tSession;
  stream: tStream;
  listen: tListen;
  sam: tSam;
};

const DEFAULT_CONFIGURATION: ConfigurationDefault = {
  session: {
    id: '',
  },
  stream: {
    destination: '',
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
  public stream: tStream;
  public listen: tListen;
  public sam: tSam;

  constructor(c: Configuration) {
    this.session = { ...DEFAULT_CONFIGURATION.session, ...(c.session || {}) };
    this.session.id = this.session.id || nanoid(DEFAULT_LENGTH_SESSION);
    this.stream = { ...DEFAULT_CONFIGURATION.stream, ...(c.stream || {}) };
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
