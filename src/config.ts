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
  id: string;
};

type tListen = {
  host: string;
  port: number;
  onMessage?: Function;
  onError?: Function;
};

type tSam = {
  hostControl: string;
  portControlTCP: number;
  portControlUDP: number;
  onError?: Function;
};

export type Configuration = {
  session: tSession;
  listen: tListen;
  sam: tSam;
};

const DEFAULT_CONFIGURATION: Configuration = {
  session: { id: '' },
  listen: { host: '127.0.0.1', port: 20211 },
  sam: { hostControl: '127.0.0.1', portControlTCP: 7656, portControlUDP: 7655 },
};

export class Config {
  public session: tSession;
  public listen: tListen;
  public sam: tSam;

  constructor(c: Configuration) {
    this.session = { ...DEFAULT_CONFIGURATION.session, ...(c.session || {}) };
    this.session.id = this.session.id || nanoid(DEFAULT_LENGTH_SESSION);
    this.listen = { ...DEFAULT_CONFIGURATION.listen, ...(c.listen || {}) };
    this.listen.port = Config.port(this.listen.port);
    this.sam = { ...DEFAULT_CONFIGURATION.sam, ...(c.sam || {}) };
    this.sam.portControlTCP = Config.port(this.sam.portControlTCP);
    this.sam.portControlUDP = Config.port(this.sam.portControlUDP);
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
