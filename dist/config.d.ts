declare type tSession = {
  id?: string;
};
declare type tStream = {
  destination: string;
};
declare type tForward = {
  host: string;
  port: number;
  silent?: boolean;
};
declare type tListen = {
  address: string;
  port: number;
  hostForward?: string;
  portForward?: number;
};
declare type tSam = {
  host: string;
  portTCP: number;
  portUDP?: number;
  versionMin?: string;
  versionMax?: string;
  publicKey?: string;
  privateKey?: string;
};
export declare type Configuration = {
  session?: tSession;
  stream?: tStream;
  forward?: tForward;
  listen?: tListen;
  sam?: tSam;
};
export declare class Config {
  session: tSession;
  forward: tForward;
  stream: tStream;
  listen: tListen;
  sam: tSam;
  constructor(c: Configuration);
  private static b;
  private static port;
}
export {};
