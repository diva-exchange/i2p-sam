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

import net from 'net';
import { I2pSam } from './i2p-sam';
import { Configuration } from './config';

class I2pSamStream extends I2pSam {
  private socketAccept: net.Socket; // incoming

  static async make(c: Configuration): Promise<I2pSamStream> {
    const r = new I2pSamStream(c);
    return await r.stream();
  }

  private constructor(c: Configuration) {
    super(c);

    this.socketAccept = net.createConnection(
      { host: this.config.sam.hostControl, port: this.config.sam.portControlTCP },
      async () => {
        await this.hello();
        await this.accept();
      }
    );
    this.socketAccept.on('error', (error: Error) => {
      if (this.config.sam.onError) {
        this.config.sam.onError(error);
      } else {
        throw error;
      }
    });
    this.socketAccept.on('data', (data: Buffer) => {
      this.incoming(data);
    });
    this.socketAccept.on('close', () => {
      //@FIXME handle closing
      console.log(`Connection to SAM (${this.config.sam.hostControl}:${this.config.sam.portControlTCP}) closed`);
    });
  }

  //@FIXME stub
  private async stream(): Promise<I2pSamStream> {
    this.socketControl.write(`SESSION CREATE STYLE=STREAM ID=${this.config.session.id} DESTINATION=TRANSIENT\n`);

    //@FIXME wait for the SESSION result

    return this;
  }

  //@FIXME stub
  private async accept(): Promise<I2pSamStream> {
    this.socketAccept.write(`SESSION ACCEPT ID=accept_${this.config.session.id}\n`);

    //@FIXME wait for the SESSION result

    return this;
  }

  //@FIXME stub
  private incoming(data: Buffer) {
    console.log(data.toString());

    this.config.listen.onMessage && this.config.listen.onMessage(data);
  }
}
