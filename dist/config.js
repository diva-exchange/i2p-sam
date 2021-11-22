"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const nanoid_1 = require("nanoid");
const DEFAULT_LENGTH_SESSION = 16;
const DEFAULT_CONFIGURATION = {
    session: {
        id: '',
    },
    stream: {
        destination: '',
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
    },
};
class Config {
    constructor(c) {
        this.session = { ...DEFAULT_CONFIGURATION.session, ...(c.session || {}) };
        this.session.id = this.session.id || (0, nanoid_1.nanoid)(DEFAULT_LENGTH_SESSION);
        this.stream = { ...DEFAULT_CONFIGURATION.stream, ...(c.stream || {}) };
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
exports.Config = Config;
