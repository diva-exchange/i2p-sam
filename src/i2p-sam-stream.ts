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
import net from 'net';

class I2pSamStream extends I2pSam {

  private socketAccept: net.Socket; // incoming

  static async make(c: Configuration): Promise<I2pSamStream> {
    const r = new I2pSamStream(c);
    return await r.stream();
  }

  private constructor(c: Configuration) {
    super(c);
    
    this.socketAccept = net.createConnection(this.config.sam.port, this.config.sam.host, async () => {
      await this.hello();
      await this.accept();
    });

    this.socketAccept.on('error', (error: Error) => {
      throw error;
    });
    this.socketAccept.on('data', (data: Buffer) => {
      this.incoming(data);
    });
    this.socketAccept.on('close', () => {
      //@FIXME handle closing
      console.log(`Connection to SAM (${this.config.sam.host}:${this.config.sam.port}) closed`);
    });
  }

  //@FIXME stub
  private async stream(): Promise<I2pSamStream> {
    this.socketControl.write(`SESSION CREATE STYLE=STREAM ID=${this.config.session.id} DESTINATION=TRANSIENT`);

    //@FIXME wait for the SESSION result

    return this;
  }

  //@FIXME stub
  private async accept(): Promise<I2pSamStream> {
    this.socketAccept.write(`SESSION ACCEPT ID=accept_${this.config.session.id}`);

    //@FIXME wait for the SESSION result

    return this;
  }

  //@FIXME stub
  private incoming(data: Buffer) {
    console.log(data.toString());
    
    this.config.listen.onMessage && this.config.listen.onMessage(data);
  }
}

export const I2PSAMStream: Function = (async (c: Configuration) => { return I2pSamStream.make(c); });
