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

import { I2pSam } from './i2p-sam';
import { Configuration } from './config';
import dgram, { Socket } from 'dgram';
import { deflateRawSync, inflateRawSync } from 'zlib';

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
      this.eventEmitter.emit('error', error);
    });

    // no listener available
    if (!(this.config.listen.port || 0)) {
      return Promise.resolve(this);
    }

    this.socketListen = dgram.createSocket('udp4', (msg: Buffer) => {
      try {
        this.config.listen.onMessage &&
          this.config.listen.onMessage(inflateRawSync(Buffer.from(msg.toString(), 'base64')));
      } catch (error) {
        return;
      }
    });
    this.socketListen.on('error', (error: Error) => {
      this.eventEmitter.emit('error', error);
    });
    this.socketListen.on('close', () => {
      this.config.listen.onClose && this.config.listen.onClose();
    });

    return new Promise((resolve, reject) => {
      try {
        this.socketListen.bind(this.config.listen.port, this.config.listen.address, () => {
          resolve(this);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  protected async initSession(): Promise<I2pSamRaw> {
    return super.initSession('RAW');
  }

  send(destination: string, msg: Buffer) {
    (async (destination: string, msg: Buffer) => {
      if (/\.i2p$/.test(destination)) {
        destination = await this.resolve(destination);
      }

      this.socketControlUDP.send(
        `3.0 ${this.config.session.id} ${destination}\n` + deflateRawSync(msg).toString('base64'),
        this.config.sam.portUDP,
        this.config.sam.host,
        (error) => {
          error && this.eventEmitter.emit('error', error);
        }
      );
    })(destination, msg);
  }
}
