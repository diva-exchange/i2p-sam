/**
 * Copyright 2021-2023 diva.exchange
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Author/Maintainer: DIVA.EXCHANGE Association, https://diva.exchange
 */

import { base32 } from 'rfc4648';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { Config, Configuration } from './config.js';
import { Socket } from 'net';

const REPLY_HELLO: string = 'HELLOREPLY';
const REPLY_DEST: string = 'DESTREPLY';
const REPLY_SESSION: string = 'SESSIONSTATUS';
const REPLY_NAMING: string = 'NAMINGREPLY';
const REPLY_STREAM: string = 'STREAMSTATUS';

const KEY_RESULT: string = 'RESULT';
const KEY_PUB: string = 'PUB';
const KEY_PRIV: string = 'PRIV';
const KEY_DESTINATION: string = 'DESTINATION';
const KEY_VALUE: string = 'VALUE';

const VALUE_OK: string = 'OK';

export class I2pSam extends EventEmitter {
  protected config: Config;
  protected socketControl: Socket = {} as Socket;

  // identity
  private publicKey: string;
  private privateKey: string;

  protected internalEventEmitter: EventEmitter;

  protected constructor(c: Configuration) {
    super();
    this.config = new Config(c);
    this.publicKey = this.config.sam.publicKey || '';
    this.privateKey = this.config.sam.privateKey || '';
    this.internalEventEmitter = new EventEmitter();
  }

  protected async open(): Promise<I2pSam> {
    this.socketControl = new Socket();
    this.socketControl.on('data', (data: Buffer): void => {
      this.parseReply(data);
    });
    this.socketControl.on('close', (): void => {
      this.emit('close');
    });

    try {
      await new Promise((resolve, reject): void => {
        this.socketControl.once('error', reject);
        this.socketControl.connect({ host: this.config.sam.host, port: this.config.sam.portTCP }, (): void => {
          this.socketControl.removeAllListeners('error');
          this.socketControl.on('error', (error: Error): void => {
            this.emit('error', error);
          });
          resolve(this);
        });
      });

      await this.hello(this.socketControl);
      if (!this.publicKey || !this.privateKey) {
        await this.generateDestination();
      }
      return this;
    } catch (error: any) {
      return Promise.reject(new Error(error.toString()));
    }
  }

  protected close(): void {
    this.socketControl.destroy();
  }

  protected async hello(socket: Socket): Promise<void> {
    return new Promise((resolve, reject): void => {
      const min: string | false = this.config.sam.versionMin || false;
      const max: string | false = this.config.sam.versionMax || false;

      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', (error: Error) => reject(error));
      this.internalEventEmitter.once('hello', resolve);

      socket.write(
        `HELLO VERSION${min ? ' MIN=' + min : ''}${max ? ' MAX=' + max : ''}\n`,
        (error: Error | undefined): void => {
          error && reject(error);
        }
      );
    });
  }

  protected async initSession(type: string): Promise<I2pSam> {
    return new Promise((resolve, reject): void => {
      let s: string = `SESSION CREATE ID=${this.config.session.id} DESTINATION=${this.privateKey} `;
      switch (type) {
        case 'STREAM':
          s += 'STYLE=STREAM';
          break;
        case 'DATAGRAM':
        case 'RAW':
          s += `STYLE=${type} PORT=${this.config.listen.portForward} HOST=${this.config.listen.hostForward}`;
          break;
      }

      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', (error: Error) => reject(error));
      this.internalEventEmitter.once('session', resolve);

      s += (this.config.session.options ? ' ' + this.config.session.options : '') + '\n';
      this.socketControl.write(s, (error: Error | undefined): void => {
        error && reject(error);
      });
    });
  }

  protected parseReply(data: Buffer) {
    const sData: string = data.toString().trim();
    const [c, s] = sData.split(' ');
    const oKeyValue = I2pSam.parseReplyKeyValue(sData);

    // command reply handling
    switch (c + s) {
      case REPLY_HELLO:
        return oKeyValue[KEY_RESULT] !== VALUE_OK
          ? this.internalEventEmitter.emit('error', new Error('HELLO failed: ' + sData))
          : this.internalEventEmitter.emit('hello');
      case REPLY_DEST:
        this.publicKey = oKeyValue[KEY_PUB] || '';
        this.privateKey = oKeyValue[KEY_PRIV] || '';
        return !this.publicKey || !this.privateKey
          ? this.internalEventEmitter.emit('error', new Error('DEST failed: ' + sData))
          : this.internalEventEmitter.emit('destination');
      case REPLY_SESSION:
        return oKeyValue[KEY_RESULT] !== VALUE_OK || !(oKeyValue[KEY_DESTINATION] || '')
          ? this.internalEventEmitter.emit('error', new Error('SESSION failed: ' + sData))
          : this.internalEventEmitter.emit('session', this);
      case REPLY_NAMING:
        return oKeyValue[KEY_RESULT] !== VALUE_OK
          ? this.internalEventEmitter.emit('error', new Error('NAMING failed: ' + sData))
          : this.internalEventEmitter.emit('naming', oKeyValue[KEY_VALUE]);
      case REPLY_STREAM:
        return oKeyValue[KEY_RESULT] !== VALUE_OK
          ? this.internalEventEmitter.emit('error', new Error('STREAM failed: ' + sData))
          : this.internalEventEmitter.emit('stream');
      default:
        return;
    }
  }

  private static parseReplyKeyValue(data: string): { [key: string]: string } {
    const [...args] = data.split(' ');
    const objResult: { [key: string]: string } = {};
    for (const s of args.filter((s: string): boolean => s.indexOf('=') > -1)) {
      const [k, v] = s.split('=');
      objResult[k.trim()] = v.trim();
    }
    return objResult;
  }

  private async generateDestination(): Promise<void> {
    this.publicKey = '';
    this.privateKey = '';
    return new Promise((resolve, reject): void => {
      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', (error: Error): void => {
        reject(error);
      });
      this.internalEventEmitter.once('destination', resolve);

      this.socketControl.write('DEST GENERATE\n', (error: Error | undefined): void => {
        error && this.internalEventEmitter.emit('error', error);
      });
    });
  }

  protected async resolve(name: string): Promise<string> {
    return new Promise((resolve, reject): void => {
      if (!/\.i2p$/.test(name)) {
        reject(new Error('Invalid I2P address: ' + name));
      }

      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', (error: Error): void => {
        reject(error);
      });
      this.internalEventEmitter.once('naming', resolve);

      this.socketControl.write(`NAMING LOOKUP NAME=${name}\n`, (error: Error | undefined): void => {
        error && this.internalEventEmitter.emit('error', error);
      });
    });
  }

  getB32Address(): string {
    return I2pSam.toB32(this.publicKey) + '.b32.i2p';
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

  static toB32(base64Destination: string): string {
    const s: Buffer = Buffer.from(base64Destination.replace(/-/g, '+').replace(/~/g, '/'), 'base64');
    return base32.stringify(crypto.createHash('sha256').update(s).digest(), { pad: false }).toLowerCase();
  }

  static async createLocalDestination(c: Configuration): Promise<{ address: string; public: string; private: string }> {
    const sam: I2pSam = new I2pSam(c);
    await sam.open();
    sam.close();
    return { address: sam.getB32Address(), public: sam.getPublicKey(), private: sam.getPrivateKey() };
  }

  static async lookup(c: Configuration, address: string): Promise<string> {
    const sam: I2pSam = new I2pSam(c);
    await sam.open();
    const s: string = await sam.resolve(address);
    sam.close();
    return s;
  }
}
