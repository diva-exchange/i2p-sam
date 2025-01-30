import { I2pSam } from './i2p-sam.js';
import { Configuration } from './config.js';
export declare class I2pSamStream extends I2pSam {
  private socketStream;
  private destination;
  private hostForward;
  private portForward;
  private hasStream;
  static createStream(c: Configuration): Promise<I2pSamStream>;
  static createForward(c: Configuration): Promise<I2pSamStream>;
  static make(c: Configuration): Promise<I2pSamStream>;
  protected open(): Promise<I2pSamStream>;
  close(): void;
  private connect;
  stream(msg: Buffer): void;
}
