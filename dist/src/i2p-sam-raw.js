"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.I2pSamRaw = void 0;
const i2p_sam_1 = require("./i2p-sam");
const dgram_1 = __importDefault(require("dgram"));
const base64url_1 = __importDefault(require("base64url"));
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
                    this.config.listen.onMessage((0, zlib_1.inflateRawSync)(Buffer.from(base64url_1.default.decode(msg.toString(), 'binary'), 'binary')));
            }
            catch (error) {
                return;
            }
        });
        this.socketListen.on('error', (error) => {
            this.config.listen.onError && this.config.listen.onError(error);
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
        return new Promise((resolve, reject) => {
            this.eventEmitter.once('session', (destination) => {
                this.publicKey = destination;
                resolve(this);
            });
            this.eventEmitter.once('error', reject);
            const dest = this.privateKey || 'TRANSIENT';
            this.socketControl.write('SESSION CREATE ' +
                'STYLE=RAW ' +
                `ID=${this.config.session.id} ` +
                `DESTINATION=${dest} ` +
                `PORT=${this.config.listen.portForward} ` +
                `HOST=${this.config.listen.hostForward}\n`);
        });
    }
    async send(destination, msg) {
        if (/\.i2p$/.test(destination)) {
            destination = await this.lookup(destination);
        }
        return new Promise((resolve, reject) => {
            const header = '3.0 ' + `${this.config.session.id} ${destination}\n`;
            const payload = base64url_1.default.encode((0, zlib_1.deflateRawSync)(msg).toString('binary'), 'binary');
            this.socketControlUDP.send(header + payload, this.config.sam.portControlUDP, this.config.sam.hostControl, (error) => {
                error ? reject(error) : resolve();
            });
        });
    }
}
exports.I2pSamRaw = I2pSamRaw;
