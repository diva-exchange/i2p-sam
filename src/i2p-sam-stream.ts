/**
 * MIT License - Copyright (c) 2021 diva.exchange
 *
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

import { Socket } from 'net';
import { I2pSam } from './i2p-sam';
import { Configuration } from './config';

export class I2pSamStream extends I2pSam {
  private socketStream: Socket = {} as Socket;
  private destination: string = '';
  private hostForward: string = '';
  private portForward: number = 0;
  private hasStream: boolean = false;

  static async make(c: Configuration): Promise<I2pSamStream> {
    const r = new I2pSamStream(c);
    await r.open();
    await r.initSession('STREAM');
    await r.connect();
    return r;
  }

  protected async open(): Promise<I2pSamStream> {
    await super.open();

    this.destination = this.config.stream.destination || '';
    this.hostForward = this.config.forward.host || '';
    this.portForward = this.config.forward.port || 0;
    if (!(this.hostForward && this.portForward > 0) && !this.destination) {
      throw new Error('Stream configuration invalid');
    }

    this.socketStream = new Socket();
    this.socketStream.on('data', (data: Buffer) => {
      if (this.hasStream) {
        this.config.stream.onData && this.config.stream.onData(data);
      } else {
        this.parseReply(data);
      }
    });
    this.socketStream.on('close', () => {
      this.emit('stream-close');
    });

    this.socketStream.connect({ host: this.config.sam.host, port: this.config.sam.portTCP }, () => {
      this.socketStream.removeAllListeners('error');
      this.socketStream.on('error', (error: Error) => {
        this.emit('error', error);
      });
    });

    await this.hello(this.socketStream);
    return Promise.resolve(this);
  }

  close() {
    this.socketStream.destroy();
    super.close();
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.internalEventEmitter.removeAllListeners();
      this.internalEventEmitter.once('error', reject);
      this.internalEventEmitter.once('stream', () => {
        this.hasStream = true;
        resolve();
      });

      let s = `STREAM FORWARD SILENT=false ID=${this.config.session.id} PORT=${this.portForward} HOST=${this.hostForward}\n`;
      if (this.destination) {
        s = `STREAM CONNECT SILENT=false ID=${this.config.session.id} DESTINATION=${this.destination}\n`;
      }
      this.socketStream.write(s, (error) => {
        error && this.internalEventEmitter.emit('error', error);
      });
    });
  }

  stream(msg: Buffer) {
    this.socketStream.write(msg, (error) => {
      error && this.emit('error', error);
    });
  }
}
