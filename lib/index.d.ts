import { I2pSam } from './i2p-sam.js';
import { I2pSamStream } from './i2p-sam-stream.js';
import { I2pSamDatagram } from './i2p-sam-datagram.js';
import { I2pSamRaw } from './i2p-sam-raw.js';
export * from './config.js';
export * from './i2p-sam.js';
export * from './i2p-sam-stream.js';
export * from './i2p-sam-datagram.js';
export * from './i2p-sam-raw.js';
export declare const createStream: typeof I2pSamStream.createStream;
export declare const createForward: typeof I2pSamStream.createForward;
export declare const createDatagram: typeof I2pSamDatagram.createDatagram;
export declare const createRaw: typeof I2pSamRaw.createRaw;
export declare const toB32: typeof I2pSam.toB32;
export declare const createLocalDestination: typeof I2pSam.createLocalDestination;
export declare const lookup: typeof I2pSam.lookup;
