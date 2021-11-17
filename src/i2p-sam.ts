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

const REPLY_HELLO = 'HELLOREPLY';
const REPLY_DEST = 'DESTREPLY';
const REPLY_SESSION = 'SESSIONSTATUS';
const REPLY_NAMING = 'NAMINGREPLY';
const REPLY_STREAM = 'STREAMSTATUS';

const KEY_RESULT = 'RESULT';
const KEY_PUB = 'PUB';
const KEY_PRIV = 'PRIV';
const KEY_DESTINATION = 'DESTINATION';
const KEY_VALUE = 'VALUE';

const VALUE_OK = 'OK';

export class I2pSam {
  protected config: Config;
  protected eventEmitter: EventEmitter;
  protected socketControl: Socket = {} as Socket;

  // identity
  protected publicKey: string = '';
  protected privateKey: string = '';

  protected constructor(c: Configuration) {
    this.config = new Config(c);
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.on('error', (error) => {
      //@FIXME logging
      console.debug(error);
      throw error;
    });
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
      this.config.sam.onClose && this.config.sam.onClose();
    });

    await this.hello(this.socketControl);
    if (!this.config.sam.publicKey || !this.config.sam.privateKey) {
      await this.generateDestination();
    }

    return Promise.resolve(this);
  }

  protected async hello(socket: Socket): Promise<void> {
    return new Promise((resolve, reject) => {
      const min = this.config.sam.versionMin || false;
      const max = this.config.sam.versionMax || false;

      try {
        socket.connect({ host: this.config.sam.host, port: this.config.sam.portTCP }, () => {
          socket.write(`HELLO VERSION${min ? ' MIN=' + min : ''}${max ? ' MAX=' + max : ''}\n`, (error) => {
            error && reject(error);
          });
        });
        this.eventEmitter.once('hello', resolve);
      } catch (error) {
        reject(error);
      }
    });
  }

  protected async initSession(type: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let s = `SESSION CREATE ID=${this.config.session.id} DESTINATION=${this.privateKey} `;
      switch (type) {
        case 'STREAM':
          s += 'STYLE=STREAM\n';
          break;
        case 'RAW':
          s += `STYLE=RAW PORT=${this.config.listen.portForward} HOST=${this.config.listen.hostForward}\n`;
          break;
      }

      try {
        this.socketControl.write(s, (error) => {
          error && reject(error);
        });
        this.eventEmitter.once('session', (destination: string) => {
          this.publicKey = destination;
          resolve(this);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  protected parseReply(data: Buffer) {
    const sData = data.toString().trim();
    const [c, s] = sData.split(' ');
    const oKeyValue = I2pSam.parseReplyKeyValue(sData);

    // command reply handling
    switch (c + s) {
      case REPLY_HELLO:
        return oKeyValue[KEY_RESULT] !== VALUE_OK
          ? this.eventEmitter.emit('error', new Error('DEST failed: ' + sData))
          : this.eventEmitter.emit('hello');
      case REPLY_DEST:
        this.publicKey = oKeyValue[KEY_PUB] || '';
        this.privateKey = oKeyValue[KEY_PRIV] || '';
        return !this.publicKey || !this.privateKey
          ? this.eventEmitter.emit('error', new Error('DEST failed: ' + sData))
          : this.eventEmitter.emit('destination');
      case REPLY_SESSION:
        return oKeyValue[KEY_RESULT] !== VALUE_OK
          ? this.eventEmitter.emit('error', new Error('SESSION failed: ' + sData))
          : this.eventEmitter.emit('session', oKeyValue[KEY_DESTINATION]);
      case REPLY_NAMING:
        return oKeyValue[KEY_RESULT] !== VALUE_OK
          ? this.eventEmitter.emit('error', new Error('NAMING failed: ' + sData))
          : this.eventEmitter.emit('naming', oKeyValue[KEY_VALUE]);
      case REPLY_STREAM:
        return oKeyValue[KEY_RESULT] !== VALUE_OK
          ? this.eventEmitter.emit('error', new Error('STREAM failed: ' + sData))
          : this.eventEmitter.emit('stream');
      default:
        return;
    }
  }

  private static parseReplyKeyValue(data: string): { [key: string]: string } {
    const [...args] = data.toString().split(' ');
    const objResult: { [key: string]: string } = {};
    for (const s of args.filter((s) => s.indexOf('=') > -1)) {
      const [k, v] = s.split('=');
      objResult[k.trim()] = v.trim();
    }
    return objResult;
  }

  private async generateDestination(): Promise<void> {
    this.publicKey = '';
    this.privateKey = '';
    return new Promise((resolve, reject) => {
      try {
        this.socketControl.write('DEST GENERATE\n', (error) => {
          error && reject(error);
        });
        this.eventEmitter.once('destination', resolve);
      } catch (error) {
        reject(error);
      }
    });
  }

  //@TODO implement caching
  async lookup(name: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!/\.i2p$/.test(name)) {
        reject(new Error('Invalid lookup name: ' + name));
      }
      try {
        this.socketControl.write(`NAMING LOOKUP NAME=${name}\n`, (error) => {
          error && reject(error);
        });
        this.eventEmitter.once('naming', resolve);
      } catch (error) {
        reject(error);
      }
    });
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  getPrivateKey(): string {
    return this.privateKey;
  }

  getKeyPair(): { public: string; private: string } {
    return {
      public: this.getPublicKey(),
      private: this.getPrivateKey(),
    };
  }
}
