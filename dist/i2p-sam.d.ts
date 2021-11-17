/// <reference types="node" />
import { EventEmitter } from 'events';
import { Config, Configuration } from './config';
import { Socket } from 'net';
export declare class I2pSam {
  protected config: Config;
  protected eventEmitter: EventEmitter;
  protected socketControl: Socket;
  protected publicKey: string;
  protected privateKey: string;
  protected constructor(c: Configuration);
  protected open(): Promise<any>;
  protected hello(socket: Socket): Promise<void>;
  protected initSession(type: string): Promise<any>;
  protected parseReply(data: Buffer): boolean | undefined;
  private static parseReplyKeyValue;
  private generateDestination;
  lookup(name: string): Promise<string>;
  getPublicKey(): string;
  getPrivateKey(): string;
  getKeyPair(): {
    public: string;
    private: string;
  };
}
