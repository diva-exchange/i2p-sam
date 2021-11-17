"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.I2pSamRaw = void 0;
const i2p_sam_1 = require("./i2p-sam");
const dgram_1 = __importDefault(require("dgram"));
const zlib_1 = require("zlib");
class I2pSamRaw extends i2p_sam_1.I2pSam {
    constructor() {
        super(...arguments);
        this.socketControlUDP = {};
        this.socketListen = {};
    }
    static async make(c) {
        const r = new I2pSamRaw(c);
        return await (await r.open()).initSession();
    }
    async open() {
        await super.open();
        this.socketControlUDP = dgram_1.default.createSocket({ type: 'udp4' });
        this.socketControlUDP.on('error', (error) => {
            this.config.sam.onError && this.config.sam.onError(error);
        });
        if (!(this.config.listen.port || 0)) {
            return Promise.resolve(this);
        }
        this.socketListen = dgram_1.default.createSocket('udp4', (msg) => {
            try {
                this.config.listen.onMessage &&
                    this.config.listen.onMessage((0, zlib_1.inflateRawSync)(Buffer.from(msg.toString(), 'base64')));
            }
            catch (error) {
                return;
            }
        });
        this.socketListen.on('error', (error) => {
            if (this.config.listen.onError) {
                this.config.listen.onError(error);
            }
            else {
                throw error;
            }
        });
        this.socketListen.on('close', () => {
            this.config.listen.onClose && this.config.listen.onClose();
        });
        return new Promise((resolve, reject) => {
            try {
                this.socketListen.bind(this.config.listen.port, this.config.listen.address, () => {
                    resolve(this);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async initSession() {
        return super.initSession('RAW');
    }
    send(destination, msg) {
        (async (destination, msg) => {
            if (/\.i2p$/.test(destination)) {
                destination = await this.lookup(destination);
            }
            this.socketControlUDP.send(`3.0 ${this.config.session.id} ${destination}\n` + (0, zlib_1.deflateRawSync)(msg).toString('base64'), this.config.sam.portUDP, this.config.sam.host, (error) => {
                if (error) {
                    throw error;
                }
            });
        })(destination, msg);
    }
}
exports.I2pSamRaw = I2pSamRaw;
