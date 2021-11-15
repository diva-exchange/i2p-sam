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

export class I2pSamRaw extends I2pSam {
  private socketControlUDP: Socket = {} as Socket; // outgoing
  private socketListen: Socket = {} as Socket; // incoming

  static async make(c: Configuration): Promise<I2pSamRaw> {
    const r = new I2pSamRaw(c);
    return await (await r.open()).raw();
  }

  private constructor(c: Configuration) {
    super(c);
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

    this.socketListen = dgram.createSocket('udp4', (msg: Buffer) => {
      this.incoming(msg);
    });
    this.socketListen.on('error', (error: Error) => {
      if (this.config.listen.onError) {
        this.config.listen.onError(error);
      } else {
        throw error;
      }
    });
    this.socketListen.on('close', () => {
      //@FIXME handle closing
      console.log(`UDP Socket (${this.config.listen.host}:${this.config.listen.port}) closed`);
    });

    return new Promise((resolve) => {
      this.socketListen.bind(this.config.listen.port, this.config.listen.host, () => {
        //@FIXME logging
        console.log(`UDP listening on ${this.config.listen.host}:${this.config.listen.port}`);
        resolve(this);
      });
    })
  }

  private async raw(): Promise<I2pSamRaw> {
    return new Promise((resolve, reject) => {
      this.eventEmitter.once('session', () => {
        resolve(this);
      });
      this.eventEmitter.once('error', reject);
      this.socketControl.write(
        'SESSION CREATE ' +
          'STYLE=RAW ' +
          `ID=${this.config.session.id} ` +
          'DESTINATION=TRANSIENT ' +
          `PORT=${this.config.listen.port} ` +
          `HOST=${this.config.listen.host}\n`
      );
    });
  }

  private incoming(msg: Buffer) {
    console.log(msg.toString());

    this.config.listen.onMessage && this.config.listen.onMessage(msg);
  }

  send(msg: Buffer) {
    this.socketControlUDP.send(msg, this.config.sam.portControlUDP, this.config.sam.hostControl);
  }
}

export const I2PSAMRaw: Function = async (c: Configuration = {} as Configuration) => {
  return I2pSamRaw.make(c);
};
