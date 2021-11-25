/// <reference types="node" />
import { I2pSam } from './i2p-sam';
import { Configuration } from './config';
export declare class I2pSamRaw extends I2pSam {
  private socketControlUDP;
  private socketListen;
  static make(c: Configuration): Promise<I2pSamRaw>;
  protected open(): Promise<I2pSamRaw>;
  close(): void;
  protected initSession(type?: string): Promise<I2pSamRaw>;
  send(destination: string, msg: Buffer): void;
}
