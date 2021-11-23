/// <reference types="node" />
import { EventEmitter } from 'events';
import { Config, Configuration } from './config';
import { Socket } from 'net';
export declare class I2pSam {
  protected config: Config;
  protected eventEmitter: EventEmitter;
  protected socketControl: Socket;
  private publicKey;
  private privateKey;
  protected constructor(c: Configuration);
  protected open(): Promise<any>;
  protected hello(socket: Socket): Promise<void>;
  protected initSession(type: string): Promise<any>;
  protected parseReply(data: Buffer): boolean | undefined;
  private static parseReplyKeyValue;
  private generateDestination;
  lookup(name: string): Promise<string>;
  getLocalDestination(): string;
  getLocalDestinationAsB32Address(): string;
  getPublicKey(): string;
  getPrivateKey(): string;
  getKeyPair(): {
    public: string;
    private: string;
  };
  static toB32(base64Destination: string): string;
}
