/// <reference types="node" />
import { I2pSam } from './i2p-sam';
import { Configuration } from './config';
export declare class I2pSamStream extends I2pSam {
    private socketStream;
    private destination;
    private hasStream;
    static make(c: Configuration): Promise<I2pSamStream>;
    protected open(): Promise<I2pSamStream>;
    private connect;
    send(msg: Buffer): void;
}
