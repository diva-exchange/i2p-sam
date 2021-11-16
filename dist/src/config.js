"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const nanoid_1 = require("nanoid");
const DEFAULT_LENGTH_SESSION = 16;
const DEFAULT_CONFIGURATION = {
    session: { id: '' },
    listen: {
        address: '127.0.0.1',
        port: 0,
        hostForward: '127.0.0.1',
        portForward: 0,
        onError: () => { },
        onClose: () => { },
    },
    sam: {
        hostControl: '127.0.0.1',
        portControlTCP: 7656,
        portControlUDP: 7655,
        versionMin: '',
        versionMax: '',
        onError: () => { },
        onClose: () => { },
    },
};
class Config {
    constructor(c) {
        this.session = { ...DEFAULT_CONFIGURATION.session, ...(c.session || {}) };
        this.session.id = this.session.id || (0, nanoid_1.nanoid)(DEFAULT_LENGTH_SESSION);
        this.listen = { ...DEFAULT_CONFIGURATION.listen, ...(c.listen || {}) };
        this.listen.port = Number(this.listen.port) > 0 ? Config.port(Number(this.listen.port)) : 0;
        this.listen.portForward =
            Number(this.listen.portForward) > 0 ? Config.port(Number(this.listen.portForward)) : this.listen.port;
        this.sam = { ...DEFAULT_CONFIGURATION.sam, ...(c.sam || {}) };
        this.sam.portControlTCP = Config.port(this.sam.portControlTCP);
        this.sam.portControlUDP = Config.port(this.sam.portControlUDP);
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
