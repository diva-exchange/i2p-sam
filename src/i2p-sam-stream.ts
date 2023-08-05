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

import { Socket } from 'net';
import { I2pSam } from './i2p-sam.js';
import { Configuration } from './config.js';
import { clearTimeout } from 'timers';

export class I2pSamStream extends I2pSam {
  private socketStream: Socket = {} as Socket;
  private destination: string = '';
  private hostForward: string = '';
  private portForward: number = 0;
  private hasStream: boolean = false;

  static async createStream(c: Configuration): Promise<I2pSamStream> {
    return await I2pSamStream.make(c);
  }

  static async createForward(c: Configuration): Promise<I2pSamStream> {
    return await I2pSamStream.make(c);
  }

  static async make(c: Configuration): Promise<I2pSamStream> {
    const r: I2pSamStream = new I2pSamStream(c);
    await r.open();
    return await new Promise((resolve, reject): void => {
      (async (r: I2pSamStream): Promise<void> => {
        const t: NodeJS.Timer = setTimeout((): void => {
          reject(new Error('Stream timeout'));
        }, r.timeout * 1000);
        try {
          await r.initSession('STREAM');
          await r.connect();
          clearTimeout(t);
          resolve(r);
        } catch (error) {
          reject(error);
        }
      })(r);
    });
  }

  protected async open(): Promise<I2pSamStream> {
    await super.open();

    this.destination = this.config.stream.destination || '';
    this.hostForward = this.config.forward.host || '';
    this.portForward = this.config.forward.port || 0;
    if (!(this.hostForward && this.portForward > 0) && !this.destination) {
      throw new Error('Stream configuration invalid');
    }

    this.socketStream = new Socket();
    this.socketStream.on('data', (data: Buffer) => {
      if (this.hasStream) {
        this.emit('data', data);
      } else {
        this.parseReply(data);
      }
    });
    this.socketStream.on('close', () => {
      this.emit('close');
    });

    this.socketStream.connect({ host: this.config.sam.host, port: this.config.sam.portTCP }, (): void => {
      this.socketStream.removeAllListeners('error');
      this.socketStream.on('error', (error: Error) => {
        this.emit('error', error);
      });
    });

    await this.hello(this.socketStream);
    return this;
  }

  close(): void {
    this.socketStream.destroy();
    super.close();
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject): void => {
      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', (error: Error) => reject(error));
      this.internalEventEmitter.once('stream', (): void => {
        this.hasStream = true;
        resolve();
      });

      let s: string;
      if (this.destination) {
        s = `STREAM CONNECT SILENT=false ID=${this.config.session.id} DESTINATION=${this.destination}\n`;
      } else {
        s =
          'STREAM FORWARD ' +
          `SILENT=${this.config.forward.silent ? 'true' : 'false'} ` +
          `ID=${this.config.session.id} PORT=${this.portForward} HOST=${this.hostForward}\n`;
      }
      this.stream(Buffer.from(s));
    });
  }

  stream(msg: Buffer): void {
    this.socketStream.write(msg, (error: Error | undefined): void => {
      error && this.emit('error', error || new Error('Failed to write to stream'));
    });
  }
}
