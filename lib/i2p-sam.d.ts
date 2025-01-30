import { EventEmitter } from 'events';
import { Config, Configuration } from './config.js';
import { Socket } from 'net';
export declare class I2pSam extends EventEmitter {
  protected config: Config;
  protected socketControl: Socket;
  protected timeout: number;
  private publicKey;
  private privateKey;
  protected internalEventEmitter: EventEmitter;
  protected constructor(c: Configuration);
  protected open(): Promise<I2pSam>;
  protected close(): void;
  protected hello(socket: Socket): Promise<void>;
  protected initSession(type: string): Promise<I2pSam>;
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
