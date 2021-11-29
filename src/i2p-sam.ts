/**
 * MIT License - Copyright (c) 2021 diva.exchange
 *
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

import { base32 } from 'rfc4648';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { Config, Configuration } from './config';
import { Socket } from 'net';
import { I2pSamDatagram, I2pSamRaw, I2pSamStream } from './i2p-sam';

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

export class I2pSam extends EventEmitter {
  protected config: Config;
  protected socketControl: Socket = {} as Socket;

  // identity
  private publicKey: string;
  private privateKey: string;

  protected internalEventEmitter: EventEmitter;

  static async createStream(c: Configuration): Promise<I2pSamStream> {
    return await I2pSamStream.make(c);
  }

  static async createForward(c: Configuration): Promise<I2pSamStream> {
    return await I2pSamStream.make(c);
  }

  static async createDatagram(c: Configuration): Promise<I2pSamDatagram> {
    return await I2pSamDatagram.make(c);
  }

  static async createRaw(c: Configuration): Promise<I2pSamRaw> {
    return await I2pSamRaw.make(c);
  }

  protected constructor(c: Configuration) {
    super();
    this.config = new Config(c);
    this.publicKey = this.config.sam.publicKey || '';
    this.privateKey = this.config.sam.privateKey || '';
    this.internalEventEmitter = new EventEmitter();
  }

  protected async open(): Promise<any> {
    this.socketControl = new Socket();
    this.socketControl.on('data', (data: Buffer) => {
      this.parseReply(data);
    });
    this.socketControl.on('close', () => {
      this.emit('control-close');
    });

    try {
      await new Promise((resolve, reject) => {
        this.socketControl.once('error', reject);
        this.socketControl.connect({ host: this.config.sam.host, port: this.config.sam.portTCP }, () => {
          this.socketControl.removeAllListeners('error');
          this.socketControl.on('error', (error: Error) => {
            this.emit('error', error);
          });
          resolve(true);
        });
      });

      await this.hello(this.socketControl);
      if (!this.publicKey || !this.privateKey) {
        await this.generateDestination();
      }
      return Promise.resolve(this);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  protected close() {
    this.socketControl.destroy();
  }

  protected async hello(socket: Socket): Promise<void> {
    return new Promise((resolve, reject) => {
      const min = this.config.sam.versionMin || false;
      const max = this.config.sam.versionMax || false;

      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', reject);
      this.internalEventEmitter.once('hello', resolve);

      socket.write(`HELLO VERSION${min ? ' MIN=' + min : ''}${max ? ' MAX=' + max : ''}\n`, (error) => {
        error && reject(error);
      });
    });
  }

  protected async initSession(type: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let s = `SESSION CREATE ID=${this.config.session.id} DESTINATION=${this.privateKey} `;
      switch (type) {
        case 'STREAM':
          s += 'STYLE=STREAM\n';
          break;
        case 'DATAGRAM':
        case 'RAW':
          s += `STYLE=${type} PORT=${this.config.listen.portForward} HOST=${this.config.listen.hostForward}\n`;
          break;
      }

      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', reject);
      this.internalEventEmitter.once('session', resolve);

      this.socketControl.write(s, (error) => {
        error && reject(error);
      });
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
      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', reject);
      this.internalEventEmitter.once('destination', resolve);

      this.socketControl.write('DEST GENERATE\n', (error) => {
        error && this.internalEventEmitter.emit('error', error);
      });
    });
  }

  protected async resolve(name: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!/\.i2p$/.test(name)) {
        reject(new Error('Invalid I2P address: ' + name));
      }

      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', reject);
      this.internalEventEmitter.once('naming', resolve);

      this.socketControl.write(`NAMING LOOKUP NAME=${name}\n`, (error) => {
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
    const sam = new I2pSam(c);
    await sam.open();
    sam.close();
    return { address: sam.getB32Address(), public: sam.getPublicKey(), private: sam.getPrivateKey() };
  }

  static async lookup(c: Configuration, address: string): Promise<string> {
    const sam = new I2pSam(c);
    await sam.open();
    const s = await sam.resolve(address);
    sam.close();
    return s;
  }
}

export * from './i2p-sam-stream';
export * from './i2p-sam-datagram';
export * from './i2p-sam-raw';

export const createStream = I2pSam.createStream;
export const createForward = I2pSam.createForward;
export const createDatagram = I2pSam.createDatagram;
export const createRaw = I2pSam.createRaw;
export const toB32 = I2pSam.toB32;
export const createLocalDestination = I2pSam.createLocalDestination;
export const lookup = I2pSam.lookup;
