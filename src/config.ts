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

type tSession = {
  type: 'stream' | 'datagram' | 'raw';
  name: string;
};

type tListen = {
  port: number;
  host: string;
  onMessage?: Function;
  onError?: Function;
};

type tSam = {
  port: number;
  host: string;
  onError?: Function;
};

export type Configuration = {
  session: tSession;
  listen: tListen;
  sam: tSam;
};

export class Config {

  private defaultConfig: Configuration = {
    session: { type: 'stream', name: '' },
    listen: { port: 20211, host: '127.0.0.1' },
    sam: { port: 7656, host: '127.0.0.1' },
  }

  public session: tSession;
  public listen: tListen;
  public sam: tSam;

  constructor(c?: Configuration) {
    this.session = c.session || this.defaultConfig.session;
    this.listen = c.listen || this.defaultConfig.listen;
    this.sam = c.sam || this.defaultConfig.sam;
  }

  /**
   * Boolean transformation
   * Returns True or False
   *
   * @param {any} n - Anything which will be interpreted as a number
   */
  private static tf(n: any): boolean {
    return Number(n) > 0;
  }

  /**
   * Number transformation
   * Boundaries
   *
   * @param {any} n - Anything transformed to a number
   * @param {number} min - Boundary minimum
   * @param {number} max - Boundary maximum
   */
  private static b(n: any, min: number, max: number): number {
    n = Number(n);
    min = Math.floor(min);
    max = Math.ceil(max);
    return n >= min && n <= max ? Math.floor(n) : n > max ? max : min;
  }

  private static port(n: any): number {
    return Number(n) ? Config.b(Number(n), 1025, 65535) : 0;
  }
}
