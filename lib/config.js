import { nanoid } from 'nanoid';
export const MIN_UDP_MESSAGE_LENGTH = 1;
export const MAX_UDP_MESSAGE_LENGTH = 16384;
const DEFAULT_LENGTH_SESSION = 16;
const DEFAULT_CONFIGURATION = {
    session: {
        id: '',
        options: '',
    },
    stream: {
        destination: '',
    },
    forward: {
        host: '',
        port: 0,
        silent: false,
    },
    listen: {
        address: '127.0.0.1',
        port: 0,
        hostForward: '',
        portForward: 0,
    },
    sam: {
        host: '127.0.0.1',
        portTCP: 7656,
        portUDP: 7655,
        versionMin: '',
        versionMax: '',
        publicKey: '',
        privateKey: '',
        timeout: 300,
    },
};
export class Config {
    constructor(c) {
        this.session = { ...DEFAULT_CONFIGURATION.session, ...(c.session || {}) };
        this.session.id = this.session.id || nanoid(DEFAULT_LENGTH_SESSION);
        this.stream = { ...DEFAULT_CONFIGURATION.stream, ...(c.stream || {}) };
        this.forward = { ...DEFAULT_CONFIGURATION.forward, ...(c.forward || {}) };
        this.forward.port = Number(this.forward.port) > 0 ? Config.port(Number(this.forward.port)) : 0;
        this.listen = { ...DEFAULT_CONFIGURATION.listen, ...(c.listen || {}) };
        this.listen.port = Number(this.listen.port) > 0 ? Config.port(Number(this.listen.port)) : 0;
        this.listen.hostForward = this.listen.hostForward || this.listen.address;
        this.listen.portForward =
            Number(this.listen.portForward) > 0 ? Config.port(Number(this.listen.portForward)) : this.listen.port;
        this.sam = { ...DEFAULT_CONFIGURATION.sam, ...(c.sam || {}) };
        this.sam.portTCP = Config.port(this.sam.portTCP);
        this.sam.portUDP = Number(this.sam.portUDP) > 0 ? Config.port(Number(this.sam.portUDP)) : 0;
    }
    static b(n, min, max) {
        n = Number(n);
        min = Math.floor(min);
        max = Math.ceil(max);
        return n >= min && n <= max ? Math.floor(n) : n > max ? max : min;
    }
    static port(n) {
        return Config.b(n, 1025, 65535);
    }
}
//# sourceMappingURL=config.js.map