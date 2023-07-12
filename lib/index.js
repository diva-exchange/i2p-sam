import { I2pSam } from './i2p-sam.js';
import { I2pSamStream } from './i2p-sam-stream.js';
import { I2pSamDatagram } from './i2p-sam-datagram.js';
import { I2pSamRaw } from './i2p-sam-raw.js';
export * from './config.js';
export * from './i2p-sam.js';
export * from './i2p-sam-stream.js';
export * from './i2p-sam-datagram.js';
export * from './i2p-sam-raw.js';
export const createStream = I2pSamStream.createStream;
export const createForward = I2pSamStream.createForward;
export const createDatagram = I2pSamDatagram.createDatagram;
export const createRaw = I2pSamRaw.createRaw;
export const toB32 = I2pSam.toB32;
export const createLocalDestination = I2pSam.createLocalDestination;
export const lookup = I2pSam.lookup;
//# sourceMappingURL=index.js.map