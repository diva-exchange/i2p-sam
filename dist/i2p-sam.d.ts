/// <reference types="node" />
import { EventEmitter } from 'events';
import { Config, Configuration } from './config';
import { Socket } from 'net';
import { I2pSamDatagram, I2pSamRaw, I2pSamStream } from './i2p-sam';
export declare class I2pSam extends EventEmitter {
  protected config: Config;
  protected socketControl: Socket;
  private publicKey;
  private privateKey;
  protected internalEventEmitter: EventEmitter;
  static createStream(c: Configuration): Promise<I2pSamStream>;
  static createForward(c: Configuration): Promise<I2pSamStream>;
  static createDatagram(c: Configuration): Promise<I2pSamDatagram>;
  static createRaw(c: Configuration): Promise<I2pSamRaw>;
  protected constructor(c: Configuration);
  protected open(): Promise<any>;
  protected close(): void;
  protected hello(socket: Socket): Promise<void>;
  protected initSession(type: string): Promise<any>;
  protected parseReply(data: Buffer): boolean | undefined;
  private static parseReplyKeyValue;
  private generateDestination;
  protected resolve(name: string): Promise<string>;
  getB32Address(): string;
  getPublicKey(): string;
  getPrivateKey(): string;
  getKeyPair(): {
    public: string;
    private: string;
  };
  static toB32(base64Destination: string): string;
  static createLocalDestination(c: Configuration): Promise<{
    address: string;
    public: string;
    private: string;
  }>;
  static lookup(c: Configuration, address: string): Promise<string>;
}
export * from './i2p-sam-stream';
export * from './i2p-sam-datagram';
export * from './i2p-sam-raw';
export declare const createStream: typeof I2pSam.createStream;
export declare const createForward: typeof I2pSam.createForward;
export declare const createDatagram: typeof I2pSam.createDatagram;
export declare const createRaw: typeof I2pSam.createRaw;
export declare const toB32: typeof I2pSam.toB32;
export declare const createLocalDestination: typeof I2pSam.createLocalDestination;
export declare const lookup: typeof I2pSam.lookup;
