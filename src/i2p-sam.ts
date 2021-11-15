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

import { EventEmitter } from 'events';
import { Config, Configuration } from './config';
import { Socket } from 'net';

export class I2pSam {
  protected config: Config;
  protected eventEmitter: EventEmitter;
  protected socketControl: Socket = {} as Socket;

  protected constructor(c: Configuration) {
    this.config = new Config(c);
    this.eventEmitter = new EventEmitter();
  }

  protected async open(): Promise<any> {
    this.socketControl = new Socket();
    this.socketControl.on('data', (data: Buffer) => {
      this.parseReply(data);
    });
    this.socketControl.on('error', (error: Error) => {
      if (this.config.sam.onError) {
        this.config.sam.onError(error);
      } else {
        throw error;
      }
    });
    this.socketControl.on('close', () => {
      //@FIXME handle closing
      console.log(`Connection to SAM (${this.config.sam.hostControl}:${this.config.sam.portControlTCP}) closed`);
    });

    return new Promise((resolve) => {
      this.socketControl.connect(
        { host: this.config.sam.hostControl, port: this.config.sam.portControlTCP },
        async () => {
          await this.hello();
          resolve(true);
        }
      );
    });
  }

  protected async hello(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.eventEmitter.once('hello', resolve);
      this.eventEmitter.once('error', reject);
      // this.socketControl.write(`HELLO VERSION MIN=${SAM_VERSION}\n`);
      this.socketControl.write('HELLO VERSION\n');
    });
  }

  async lookup(name: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!/\.i2p$/.test(name)) {
        reject(new Error('Invalid lookup name: ' + name));
      }
      this.eventEmitter.once('naming', (result: string) => {
        resolve(result);
      });
      this.eventEmitter.once('error', reject);

      this.socketControl.write(`NAMING LOOKUP NAME=${name}\n`);
    });
  }

  private parseReply(data: Buffer) {
    console.log(data.toString());
    const [c, s, ...args] = data.toString().split(' ');

    // error handling
    if (!args.includes('RESULT=OK')) {
      this.eventEmitter.emit('error', new Error('SAM command failed: ' + data.toString()));
    }

    // command reply handling
    switch (c + s) {
      case 'HELLOREPLY':
        this.eventEmitter.emit('hello');
        break;
      case 'SESSIONSTATUS':
        this.eventEmitter.emit('session', args);
        break;
      case 'NAMINGREPLY':
        for (const s of args) {
          const [k, v] = s.split('=');
          if (k === 'RESULT') {
            this.eventEmitter.emit('naming', v);
            break;
          }
        }
        break;
      case 'STREAMSTATUS':
        this.eventEmitter.emit('stream-status', args);
        break;
      case 'STREAMACCEPT':
        this.eventEmitter.emit('stream-accept', args);
        break;
      default:
        this.eventEmitter.emit('error', new Error('Unsupported SAM reply: ' + data.toString()));
    }
  }
}
