import { I2pSamRaw } from './i2p-sam-raw';
import { Configuration } from './config';
export declare class I2pSamDatagram extends I2pSamRaw {
  static make(c: Configuration): Promise<I2pSamDatagram>;
  protected initSession(): Promise<I2pSamDatagram>;
}
