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

import { I2pSam } from 'i2p-sam';
import { Configuration } from 'config';
import dgram from 'dgram';

const PORT_RAW_CONTROL = 7655;

class I2pSamRaw extends I2pSam {

  private socketControlRaw: dgram.Socket; // outgoing
  private socketRaw: dgram.Socket; // incoming

  static async make(c: Configuration): Promise<I2pSamRaw> {
    const r = new I2pSamRaw(c);
    return await r.raw();
  }

  private constructor(c: Configuration) {
    super(c);

    this.socketControlRaw = dgram.createSocket();
    this.socketControlRaw.on('error', (error: Error) => {
      throw error;
    });
    this.socketControlRaw.on('close', () => {
      //@FIXME handle closing
      console.log(`UDP Socket (${this.config.sam.host}:${PORT_RAW_CONTROL}) closed`);
    });
    this.socketControlRaw.bind({port: PORT_RAW_CONTROL, address: this.config.sam.host});
    
    this.socketRaw = dgram.createSocket();
    this.socketRaw.on('error', (error: Error) => {
      throw error;
    });
    this.socketRaw.on('message', (data: Buffer) => {
      this.incoming(data);
    });
    this.socketRaw.on('close', () => {
      //@FIXME handle closing
      console.log(`UDP Socket (${this.config.listen.host}:${this.config.listen.port}) closed`);
    });
    this.socketRaw.bind({port: this.config.listen.port, address: this.config.listen.host});
  }

  //@FIXME stub
  private async raw(): Promise<I2pSamRaw> {
    this.socketControl.write(`SESSION CREATE ` +
      `STYLE=RAW ID=${this.config.session.id} ` +
      `DESTINATION=TRANSIENT ` +
      `PORT=${this.config.listen.port} ` +
      `HOST=${this.config.listen.host}\n`);

    //@FIXME wait for the SESSION result
    return this;    
  }

  //@FIXME stub
  private incoming(data: Buffer) {
    console.log(data.toString());
    
    this.config.listen.onMessage && this.config.listen.onMessage(data);
  }
  
  send(data: Buffer) {
    this.socketControlRaw.send(data);
  }
}

export const I2PSAMRaw: Function = (async (c: Configuration) => { return I2pSamRaw.make(c); });
