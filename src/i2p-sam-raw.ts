/**
 * Copyright 2021-2022 diva.exchange
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
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

import { I2pSam } from './i2p-sam';
import { Configuration } from './config';
import dgram, { Socket } from 'dgram';

const MIN_UDP_MESSAGE_LENGTH = 1;
const MAX_UDP_MESSAGE_LENGTH = 31744;

export class I2pSamRaw extends I2pSam {
  private socketControlUDP: Socket = {} as Socket; // outgoing
  private socketListen: Socket = {} as Socket; // incoming

  static async make(c: Configuration): Promise<I2pSamRaw> {
    const r = new I2pSamRaw(c);
    await r.open();
    await r.initSession();
    return r;
  }

  protected async open(): Promise<I2pSamRaw> {
    await super.open();

    this.socketControlUDP = dgram.createSocket({ type: 'udp4' });
    this.socketControlUDP.on('error', (error: Error) => {
      this.emit('error', error);
    });

    // no listener available
    if (!(this.config.listen.port || 0)) {
      return Promise.resolve(this);
    }

    this.socketListen = dgram.createSocket('udp4', (msg: Buffer) => {
      try {
        let [fromDestination, message] = msg.toString().split('\n');
        if (!message) {
          message = fromDestination;
          fromDestination = '';
        }
        this.emit('data', Buffer.from(message, 'base64'), fromDestination);
      } catch (error) {
        return;
      }
    });
    this.socketListen.on('close', () => {
      this.emit('close');
    });

    return new Promise((resolve, reject) => {
      this.socketListen.once('error', (error: Error) => {
        reject(error);
      });
      this.socketListen.bind(this.config.listen.port, this.config.listen.address, () => {
        this.socketListen.removeAllListeners('error');
        this.socketListen.on('error', (error: Error) => {
          this.emit('error', error);
        });
        resolve(this);
      });
    });
  }

  close() {
    this.socketControlUDP.close();
    this.socketListen.close();
    super.close();
  }

  protected async initSession(type: string = 'RAW'): Promise<I2pSamRaw> {
    return super.initSession(type);
  }

  send(destination: string, msg: Buffer) {
    (async (destination: string, msg: Buffer) => {
      if (/\.i2p$/.test(destination)) {
        destination = await this.resolve(destination);
      }

      const s = msg.toString('base64');
      if (s.length < MIN_UDP_MESSAGE_LENGTH) {
        return this.emit('error', new Error('I2pSamRaw.send(): message length < MIN_UDP_MESSAGE_LENGTH'));
      } else if (s.length > MAX_UDP_MESSAGE_LENGTH) {
        return this.emit('error', new Error('I2pSamRaw.send(): message length > MAX_UDP_MESSAGE_LENGTH'));
      }

      try {
        this.socketControlUDP.send(
          `3.0 ${this.config.session.id} ${destination}\n` + s,
          this.config.sam.portUDP,
          this.config.sam.host,
          (error) => {
            error && this.emit('error', error);
          }
        );
      } catch (error: any) {
        return this.emit('error', new Error(error.toString()));
      }
    })(destination, msg);
  }
}
