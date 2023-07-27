import { I2pSamRaw } from './i2p-sam-raw.js';
import { Configuration } from './config.js';
export declare class I2pSamDatagram extends I2pSamRaw {
  static createDatagram(c: Configuration): Promise<I2pSamDatagram>;
  static make(c: Configuration): Promise<I2pSamDatagram>;
  protected constructor(c: Configuration);
  protected initSession(): Promise<I2pSamDatagram>;
}
