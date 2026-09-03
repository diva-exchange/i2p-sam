/**
 * Copyright 2021-2026 diva.exchange
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

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Socket } from 'node:net';
import { Config, type Configuration } from './config.ts';
import sodium, { SecureBuffer } from 'sodium-native';
import { encodeBase32 } from '@std/encoding/base32';
import { indexOfNeedle } from '@std/bytes';

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

export function toB32(base64Destination: string): string {
  return I2pSam.toB32(base64Destination);
}
export async function createLocalDestination(
  c: Configuration,
): Promise<{ address: string; public: string; private: SecureBuffer | null }> {
  return await I2pSam.createLocalDestination(c);
}
export async function lookup(
  c: Configuration,
  address: string,
): Promise<string> {
  return await I2pSam.lookup(c, address);
}

export class I2pSam extends EventEmitter {
  protected config: Config;
  protected socketControl: Socket = {} as Socket;
  protected timeout: number = 0;

  // identity
  private publicKey: string;
  private privateKey: SecureBuffer | null;

  protected internalEventEmitter: EventEmitter;

  protected constructor(c: Configuration) {
    super();
    this.config = new Config(c);
    this.timeout = this.config.sam.timeout && this.config.sam.timeout >= 1 &&
        this.config.sam.timeout <= 600
      ? this.config.sam.timeout
      : 300;
    this.publicKey = this.config.sam.publicKey || '';
    this.privateKey = this.config.sam.privateKey || null;
    this.internalEventEmitter = new EventEmitter();
  }

  protected async open(): Promise<I2pSam> {
    this.socketControl = new Socket();
    this.socketControl.on('data', (data: Uint8Array): void => {
      this.parseReply(data);
    });
    this.socketControl.on('close', (): void => {
      this.emit('close');
    });

    try {
      await new Promise((resolve, reject): void => {
        this.socketControl.once('error', reject);
        this.socketControl.connect({
          host: this.config.sam.host,
          port: this.config.sam.portTCP,
        }, (): void => {
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
    } catch (e: unknown) {
      return Promise.reject(e as Error);
    }
  }

  protected close(): void {
    this.publicKey = '';
    if (this.privateKey) {
      sodium.sodium_munlock(this.privateKey);
      sodium.sodium_memzero(this.privateKey);
      this.privateKey = null;
    }
    this.internalEventEmitter.removeAllListeners();
    if (
      this.socketControl && typeof this.socketControl.destroy === 'function' &&
      !this.socketControl.destroyed
    ) {
      this.socketControl.destroy();
    }
  }

  protected hello(socket: Socket): Promise<void> {
    return new Promise((resolve, reject): void => {
      const min: string | false = this.config.sam.versionMin || false;
      const max: string | false = this.config.sam.versionMax || false;

      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', reject);
      this.internalEventEmitter.once('hello', resolve);

      socket.write(
        `HELLO VERSION${min ? ' MIN=' + min : ''}${max ? ' MAX=' + max : ''}\n`,
        (error: Error | null | undefined): void => {
          if (error) {
            reject(error);
          }
        },
      );
    });
  }

  protected initSession(type: string): Promise<I2pSam> {
    return new Promise((resolve, reject): void => {
      const prefixStr =
        `SESSION CREATE ID=${this.config.session.id} DESTINATION=`;
      const prefixBuf = new TextEncoder().encode(prefixStr);

      let suffixStr = ' ';
      if (type === 'STREAM') suffixStr += 'STYLE=STREAM';
      else if (type === 'DATAGRAM' || type === 'RAW') {
        suffixStr +=
          `STYLE=${type} PORT=${this.config.listen.portForward} HOST=${this.config.listen.hostForward}`;
      }
      suffixStr +=
        (this.config.session.options ? ' ' + this.config.session.options : '') +
        '\n';
      const suffixBuf: Uint8Array = new TextEncoder().encode(suffixStr);

      const len: number = prefixBuf.length + (this.privateKey?.length || 0) +
        suffixBuf.length;
      const outBuf: SecureBuffer = sodium.sodium_malloc(len);
      sodium.sodium_mlock(outBuf);

      outBuf.set(prefixBuf, 0);
      if (this.privateKey) outBuf.set(this.privateKey, prefixBuf.length);
      outBuf.set(suffixBuf, prefixBuf.length + (this.privateKey?.length || 0));

      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', reject);
      this.internalEventEmitter.once('session', resolve);

      this.socketControl.write(
        outBuf,
        (error: Error | null | undefined): void => {
          sodium.sodium_munlock(outBuf);
          sodium.sodium_memzero(outBuf);
          if (error) reject(error);
        },
      );
    });
  }

  protected parseReply(data: Uint8Array): void {
    const privTag = new TextEncoder().encode(KEY_PRIV + '=');
    const idx = indexOfNeedle(data, privTag);
    let extractedPriv: SecureBuffer | null = null;

    if (idx !== -1) {
      const start = idx + privTag.length;
      let end = data.indexOf(32, start); // Space
      if (end === -1) end = data.indexOf(10, start); // Newline
      if (end === -1) end = data.length;

      const len = end - start;
      extractedPriv = sodium.sodium_malloc(len);
      sodium.sodium_mlock(extractedPriv);
      extractedPriv.set(data.subarray(start, end));
      sodium.sodium_memzero(data.subarray(start, end) as SecureBuffer);
    }

    const sData: string = new TextDecoder().decode(data).trim();
    const [c, s] = sData.split(' ');
    const oKeyValue = I2pSam.parseReplyKeyValue(sData);
    // command reply handling
    switch (c + s) {
      case REPLY_HELLO:
        oKeyValue[KEY_RESULT] !== VALUE_OK
          ? this.internalEventEmitter.emit(
            'error',
            new Error('HELLO failed: ' + sData),
          )
          : this.internalEventEmitter.emit('hello');
        return;
      case REPLY_DEST:
        this.publicKey = oKeyValue[KEY_PUB] || '';
        if (extractedPriv) {
          if (this.privateKey) {
            sodium.sodium_munlock(this.privateKey);
            sodium.sodium_memzero(this.privateKey);
          }
          this.privateKey = extractedPriv;
        }

        if (!this.publicKey || !this.privateKey) {
          this.internalEventEmitter.emit(
            'error',
            new Error('DEST failed: ' + sData),
          );
        } else {
          this.internalEventEmitter.emit('destination');
        }
        return;
      case REPLY_SESSION:
        oKeyValue[KEY_RESULT] !== VALUE_OK ||
          !(oKeyValue[KEY_DESTINATION] || '')
          ? this.internalEventEmitter.emit(
            'error',
            new Error('SESSION failed: ' + sData),
          )
          : this.internalEventEmitter.emit('session', this);
        return;
      case REPLY_NAMING:
        oKeyValue[KEY_RESULT] !== VALUE_OK
          ? this.internalEventEmitter.emit(
            'error',
            new Error('NAMING failed: ' + sData),
          )
          : this.internalEventEmitter.emit('naming', oKeyValue[KEY_VALUE]);
        return;
      case REPLY_STREAM:
        oKeyValue[KEY_RESULT] !== VALUE_OK
          ? this.internalEventEmitter.emit(
            'error',
            new Error('STREAM failed: ' + sData),
          )
          : this.internalEventEmitter.emit('stream');
        return;
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

  private generateDestination(): Promise<void> {
    this.publicKey = '';
    if (this.privateKey) {
      sodium.sodium_munlock(this.privateKey);
      sodium.sodium_memzero(this.privateKey);
      this.privateKey = null;
    }
    return new Promise((resolve, reject): void => {
      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', (error: Error): void => {
        reject(error);
      });
      this.internalEventEmitter.once('destination', resolve);

      this.socketControl.write(
        'DEST GENERATE\n',
        (error: Error | null | undefined): void => {
          if (error) {
            this.internalEventEmitter.emit('error', error);
          }
        },
      );
    });
  }

  protected resolve(name: string): Promise<string> {
    return new Promise((resolve, reject): void => {
      if (!/\.i2p$/.test(name)) {
        reject(new Error('Invalid I2P address: ' + name));
      }

      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', (error: Error): void => {
        reject(error);
      });
      this.internalEventEmitter.once('naming', resolve);

      this.socketControl.write(
        `NAMING LOOKUP NAME=${name}\n`,
        (error: Error | null | undefined): void => {
          if (error) {
            this.internalEventEmitter.emit('error', error);
          }
        },
      );
    });
  }

  public getB32Address(): string {
    return I2pSam.toB32(this.publicKey) + '.b32.i2p';
  }

  public getPublicKey(): string {
    return this.publicKey;
  }

  public getPrivateKey(): SecureBuffer | null {
    return this.privateKey;
  }

  public getKeyPair(): { public: string; private: SecureBuffer | null } {
    return {
      public: this.getPublicKey(),
      private: this.getPrivateKey(),
    };
  }

  public static toB32(base64Destination: string): string {
    const i: string = base64Destination.replace(/-/g, '+').replace(/~/g, '/');
    const s: Uint8Array = new Uint8Array(atob(i).length);
    // setFromBase64 ist ein neueres Deno-Feature, alternativ decodeBase64 nutzen
    s.setFromBase64(i);

    const hash = crypto.createHash('sha256').update(s).digest();
    // base32 aus std/encoding erzeugt Großbuchstaben mit Padding (=), I2P braucht kleine ohne =
    return encodeBase32(hash).toLowerCase().replace(/=+$/, '');
  }

  public static async createLocalDestination(
    c: Configuration,
  ): Promise<
    { address: string; public: string; private: SecureBuffer | null }
  > {
    const sam: I2pSam = new I2pSam(c);
    let privCopy: SecureBuffer | null = null;
    let pubCopy: string = '';
    let addrCopy: string = '';

    try {
      await sam.open();
      pubCopy = sam.getPublicKey();
      addrCopy = sam.getB32Address();

      const priv = sam.getPrivateKey();
      if (priv) {
        privCopy = sodium.sodium_malloc(priv.length);
        sodium.sodium_mlock(privCopy);
        privCopy.set(priv);
      }
    } finally {
      sam.close();
    }

    return {
      address: addrCopy,
      public: pubCopy,
      private: privCopy,
    };
  }

  public static async lookup(
    c: Configuration,
    address: string,
  ): Promise<string> {
    const sam: I2pSam = new I2pSam(c);
    let s: string = '';
    try {
      await sam.open();
      s = await sam.resolve(address);
    } finally {
      sam.close();
    }
    return s;
  }
}
