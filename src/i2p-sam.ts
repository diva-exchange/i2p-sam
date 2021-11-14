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

import { Configuration, Config } from 'config';
import net from 'net';

const SAM_VERSION = '3.1';

export class I2pSam {

  protected config: Config;
  protected socketControl: net.Socket;
  
  protected constructor(c: Configuration) {
    this.config = new Config(c);
    this.socketControl = net.createConnection(this.config.sam.port, this.config.sam.host, async () => {
      await this.hello();
    });

    this.socketControl.on('error', (error: Error) => {
      throw error;
    });
    this.socketControl.on('data', (data: Buffer) => {
      this.parseReply(data);
    });
    this.socketControl.on('close', () => {
      //@FIXME handle closing
      console.log(`Connection to SAM (${this.config.sam.host}:${this.config.sam.port}) closed`);
    });
  }

  protected async hello(): Promise<void> {
    this.socketControl.write(`HELLO VERSION MIN=${SAM_VERSION} MAX=${SAM_VERSION}\n`);
    
    //@FIXME wait for response
    
    throw new Error('Could not connect');
  }
  
    //@FIXME stub
  public async lookup(name: string): Promise<string> {
    if (!/\.i2p$/.test(name)) {
      throw new Error('Invalid lookup name');
    }
    this.socketControl.write(`NAMING LOOKUP NAME=${name}\n`);
    
    //@FIXME wait for the look up result...
    
    return '';
  }

  private parseReply(data: Buffer) {
    console.log(data.toString());
    const [c, s, ...args] = data.toString().split(' ');

    // error handling
    if (!args.includes('RESULT=OK')) {
      const e: Error = new Error('SAM command failed');
      if (!this.config.sam.onError) {  
        throw e;
      } else {
        this.config.sam.onError(e);
      }
    }
    
    // command reply handling
    switch (c + s) {
      case 'HELLOREPLY':
        break;
      case 'SESSIONSTATUS':
        break;
      case 'NAMINGREPLY':
        break;
    }
  }
}