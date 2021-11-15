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
import base64url from 'base64url';
import { compressSync, uncompressSync } from 'snappy';

export class I2pSamRaw extends I2pSam {
  private socketControlUDP: Socket = {} as Socket; // outgoing
  private socketListen: Socket = {} as Socket; // incoming
  private localDestination: string = '';

  static async make(c: Configuration): Promise<I2pSamRaw> {
    const r = new I2pSamRaw(c);
    return await (await r.open()).initSession();
  }

  protected async open(): Promise<I2pSamRaw> {
    await super.open();

    this.socketControlUDP = dgram.createSocket({ type: 'udp4' });
    this.socketControlUDP.on('error', (error: Error) => {
      if (this.config.sam.onError) {
        this.config.sam.onError(error);
      } else {
        throw error;
      }
    });

    // no listener available
    if (!(this.config.listen.port || 0)) {
      return Promise.resolve(this);
    }

    this.socketListen = dgram.createSocket('udp4', (msg: Buffer) => {
      this.config.listen.onMessage &&
        this.config.listen.onMessage(uncompressSync(Buffer.from(base64url.decode(msg.toString(), 'hex'), 'hex')));
    });
    this.socketListen.on('error', (error: Error) => {
      if (this.config.listen.onError) {
        this.config.listen.onError(error);
      } else {
        throw error;
      }
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

  private async initSession(): Promise<I2pSamRaw> {
    return new Promise((resolve, reject) => {
      this.eventEmitter.once('session', (destination: string) => {
        this.localDestination = destination.trim();
        resolve(this);
      });
      this.eventEmitter.once('error', reject);
      this.socketControl.write(
        'SESSION CREATE ' +
          'STYLE=RAW ' +
          `ID=${this.config.session.id} ` +
          'DESTINATION=TRANSIENT ' +
          `PORT=${this.config.listen.portForward} ` +
          `HOST=${this.config.listen.hostForward}\n`
      );
    });
  }

  me(): string {
    return this.localDestination;
  }

  async send(destination: string, msg: Buffer): Promise<void> {
    if (/\.i2p$/.test(destination)) {
      destination = await this.lookup(destination);
    }

    return new Promise((resolve, reject) => {
      const s =
        '3.0 ' +
        `${this.config.session.id} ${destination}\n` +
        base64url.encode(compressSync(msg).toString('hex'), 'hex');
      this.socketControlUDP.send(s, this.config.sam.portControlUDP, this.config.sam.hostControl, (error) => {
        error ? reject(error) : resolve();
      });
    });
  }
}

export const I2PSAMRaw = async (c: Configuration = {} as Configuration) => {
  return I2pSamRaw.make(c);
};
