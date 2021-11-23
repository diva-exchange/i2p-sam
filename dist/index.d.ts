import { Configuration } from './config';
import { I2pSamStream } from './i2p-sam-stream';
import { I2pSamRaw } from './i2p-sam-raw';
export declare const I2PSAMStream: (c: Configuration) => Promise<I2pSamStream>;
export declare const I2PSAMRaw: (c: Configuration) => Promise<I2pSamRaw>;
export declare const toB32: (s: string) => string;
export declare const createLocalDestination: (c: Configuration) => Promise<{
  address: string;
  public: string;
  private: string;
}>;
export declare const lookup: (c: Configuration, address: string) => Promise<string>;
