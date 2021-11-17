import { Configuration } from './config';
import { I2pSamStream } from './i2p-sam-stream';
import { I2pSamRaw } from './i2p-sam-raw';
export declare const I2PSAMStream: (c: Configuration) => Promise<I2pSamStream>;
export declare const I2PSAMRaw: (c: Configuration) => Promise<I2pSamRaw>;
