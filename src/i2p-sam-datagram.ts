/**
 * Copyright 2021-2023 diva.exchange
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

import { I2pSamRaw } from './i2p-sam-raw.js';
import { Configuration } from './config.js';

export class I2pSamDatagram extends I2pSamRaw {
  static async createDatagram(c: Configuration): Promise<I2pSamDatagram> {
    return await I2pSamDatagram.make(c);
  }

  static make(c: Configuration): Promise<I2pSamDatagram> {
    return new Promise((resolve, reject): void => {
      (async (d: I2pSamDatagram): Promise<void> => {
        const t: NodeJS.Timeout = setTimeout((): void => {
          d.close();
          reject(new Error(`I2pSamDatagram timeout (${d.timeout}s)`));
        }, d.timeout * 1000);
        try {
          await d.open();
          await d.initSession();
          resolve(d);
        } catch (error) {
          d.close();
          reject(error);
        } finally {
          clearTimeout(t);
        }
      })(new I2pSamDatagram(c));
    });
  }

  protected constructor(c: Configuration) {
    super(c);
    this.isReplyAble = true;
  }

  protected async initSession(): Promise<I2pSamDatagram> {
    await super.initSession('DATAGRAM');
    return this;
  }
}
