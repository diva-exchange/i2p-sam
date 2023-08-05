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

import { I2pSam } from './i2p-sam.js';
import { Configuration, MIN_UDP_MESSAGE_LENGTH, MAX_UDP_MESSAGE_LENGTH } from './config.js';
import dgram, { Socket } from 'dgram';
import { clearTimeout } from 'timers';

export class I2pSamRaw extends I2pSam {
  protected isReplyAble: boolean; // whether the udp message contains the message origin
  private socketControlUDP: Socket; // outgoing
  private socketListen: Socket; // incoming

  static async createRaw(c: Configuration): Promise<I2pSamRaw> {
    return await I2pSamRaw.make(c);
  }

  static async make(c: Configuration): Promise<I2pSamRaw> {
    const r: I2pSamRaw = new I2pSamRaw(c);
    await r.open();
    return await new Promise((resolve, reject): void => {
      (async (r: I2pSamRaw): Promise<void> => {
        const t: NodeJS.Timer = setTimeout((): void => {
          reject(new Error('I2pSamRaw timeout'));
        }, r.timeout * 1000);
        try {
          await r.initSession();
          clearTimeout(t);
          resolve(r);
        } catch (error) {
          reject(error);
        }
      })(r);
    });
  }

  protected constructor(c: Configuration) {
    super(c);
    this.isReplyAble = false;
    this.socketControlUDP = {} as Socket;
    this.socketListen = {} as Socket;
  }

  protected async open(): Promise<I2pSamRaw> {
    await super.open();

    this.socketControlUDP = dgram.createSocket({ type: 'udp4' });
    this.socketControlUDP.on('error', (error: Error): void => {
      this.emit('error', error);
    });

    // no listener available
    if (!(this.config.listen.port || 0)) {
      return Promise.resolve(this);
    }

    this.socketListen = dgram.createSocket('udp4', (msg: Buffer): void => {
      try {
        let fromDestination: string = '';
        let message: Buffer;
        if (this.isReplyAble) {
          const i: number = msg.indexOf(10); // 10 = ascii value of \n
          fromDestination = msg.subarray(0, i).toString();
          message = msg.subarray(i + 1);
        } else {
          message = msg;
        }
        this.emit('data', message, fromDestination);
      } catch (error) {
        this.emit('error', error);
      }
    });
    this.socketListen.on('close', (): void => {
      this.emit('close');
    });

    return new Promise((resolve, reject): void => {
      this.socketListen.once('error', (error: Error): void => {
        reject(error);
      });
      this.socketListen.bind(this.config.listen.port, this.config.listen.address, (): void => {
        this.socketListen.removeAllListeners('error');
        this.socketListen.on('error', (error: Error): void => {
          this.emit('error', error);
        });
        resolve(this);
      });
    });
  }

  close(): void {
    this.socketControlUDP.close();
    this.socketListen.close();
    super.close();
  }

  protected async initSession(type: string = 'RAW'): Promise<I2pSamRaw> {
    await super.initSession(type);
    return this;
  }

  send(destination: string, msg: Buffer): void {
    if (msg.byteLength < MIN_UDP_MESSAGE_LENGTH || msg.byteLength > MAX_UDP_MESSAGE_LENGTH) {
      this.emit('error', new Error('I2pSamRaw.send(): invalid message length'));
      return;
    }

    if (/\.i2p$/.test(destination)) {
      (async (): Promise<void> => {
        this.s(await this.resolve(destination), msg);
      })();
    } else {
      this.s(destination, msg);
    }
  }

  private s(destination: string, msg: Buffer): void {
    try {
      this.socketControlUDP.send(
        Buffer.concat([Buffer.from(`3.0 ${this.config.session.id} ${destination}\n`), msg]),
        this.config.sam.portUDP,
        this.config.sam.host,
        (error: Error | null): void => {
          error && this.emit('error', error);
        }
      );
    } catch (error: any) {
      this.emit('error', new Error(error.toString()));
    }
  }
}
