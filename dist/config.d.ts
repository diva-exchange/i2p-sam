type tSession = {
  id?: string;
  options?: string;
};
type tStream = {
  destination: string;
};
type tForward = {
  host: string;
  port: number;
  silent?: boolean;
};
type tListen = {
  address: string;
  port: number;
  hostForward?: string;
  portForward?: number;
};
type tSam = {
  host: string;
  portTCP: number;
  portUDP?: number;
  versionMin?: string;
  versionMax?: string;
  publicKey?: string;
  privateKey?: string;
};
export type Configuration = {
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
