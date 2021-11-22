declare type tSession = {
  id?: string;
};
declare type tStream = {
  destination: string;
  onMessage?: Function;
  onClose?: Function;
};
declare type tListen = {
  address: string;
  port: number;
  hostForward?: string;
  portForward?: number;
  onMessage?: Function;
  onClose?: Function;
};
declare type tSam = {
  host: string;
  portTCP: number;
  portUDP?: number;
  versionMin?: string;
  versionMax?: string;
  publicKey?: string;
  privateKey?: string;
  onClose?: Function;
};
export declare type Configuration = {
  session?: tSession;
  stream?: tStream;
  listen?: tListen;
  sam?: tSam;
};
export declare class Config {
  session: tSession;
  stream: tStream;
  listen: tListen;
  sam: tSam;
  constructor(c: Configuration);
  private static b;
  private static port;
}
export {};
