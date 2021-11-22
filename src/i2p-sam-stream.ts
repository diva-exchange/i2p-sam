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

import { Socket } from 'net';
import { I2pSam } from './i2p-sam';
import { Configuration } from './config';

export class I2pSamStream extends I2pSam {
  private socketStream: Socket = {} as Socket;
  private destination: string = '';
  private hasStream: boolean = false;

  static async make(c: Configuration): Promise<I2pSamStream> {
    const r = new I2pSamStream(c);
    await r.open();
    await r.initSession('STREAM');
    await r.connect();
    return r;
  }

  protected async open(): Promise<I2pSamStream> {
    await super.open();

    this.socketStream = new Socket();
    this.socketStream.on('data', (data: Buffer) => {
      if (this.hasStream) {
        this.config.stream.onMessage && this.config.stream.onMessage(data);
      } else {
        this.parseReply(data);
      }
    });
    this.socketStream.on('error', (error: Error) => {
      this.eventEmitter.emit('error', error);
    });
    this.socketStream.on('close', () => {
      this.hasStream = false;
      this.config.stream.onClose && this.config.stream.onClose();
    });

    await this.hello(this.socketStream);

    return Promise.resolve(this);
  }

  private async connect(): Promise<void> {
    // connect to the destination
    this.destination = this.config.stream.destination || '';
    if (!this.destination) {
      throw new Error('Stream destination empty');
    }

    return new Promise((resolve, reject) => {
      this.eventEmitter.removeAllListeners('error');
      this.eventEmitter.once('error', reject);
      this.eventEmitter.removeAllListeners('stream');
      this.eventEmitter.once('stream', () => {
        this.hasStream = true;
        resolve();
      });

      const s = `STREAM CONNECT SILENT=false ID=${this.config.session.id} DESTINATION=${this.destination}\n`;
      this.socketStream.write(s, (error) => {
        error && this.eventEmitter.emit('error', error);
      });
    });
  }

  send(msg: Buffer) {
    this.socketStream.write(msg, (error) => {
      error && this.eventEmitter.emit('error', error);
    });
  }
}
