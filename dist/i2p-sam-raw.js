"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.I2pSamRaw = void 0;
const i2p_sam_1 = require("./i2p-sam");
const dgram_1 = __importDefault(require("dgram"));
const MIN_UDP_MESSAGE_LENGTH = 1;
const MAX_UDP_MESSAGE_LENGTH = 31744;
class I2pSamRaw extends i2p_sam_1.I2pSam {
    constructor() {
        super(...arguments);
        this.socketControlUDP = {};
        this.socketListen = {};
    }
    static async make(c) {
        const r = new I2pSamRaw(c);
        await r.open();
        await r.initSession();
        return r;
    }
    async open() {
        await super.open();
        this.socketControlUDP = dgram_1.default.createSocket({ type: 'udp4' });
        this.socketControlUDP.on('error', (error) => {
            this.emit('error', error);
        });
        if (!(this.config.listen.port || 0)) {
            return Promise.resolve(this);
        }
        this.socketListen = dgram_1.default.createSocket('udp4', (msg) => {
            try {
                let [fromDestination, message] = msg.toString().split('\n');
                if (!message) {
                    message = fromDestination;
                    fromDestination = '';
                }
                this.config.listen.onMessage && this.config.listen.onMessage(Buffer.from(message, 'base64'), fromDestination);
            }
            catch (error) {
                return;
            }
        });
        this.socketListen.on('close', () => {
            this.emit('listen-close');
        });
        return new Promise((resolve, reject) => {
            this.socketListen.once('error', (error) => {
                reject(error);
            });
            this.socketListen.bind(this.config.listen.port, this.config.listen.address, () => {
                this.socketListen.removeAllListeners('error');
                this.socketListen.on('error', (error) => {
                    this.emit('error', error);
                });
                resolve(this);
            });
        });
    }
    close() {
        this.socketControlUDP.close();
        this.socketListen.close();
        super.close();
    }
    async initSession(type = 'RAW') {
        return super.initSession(type);
    }
    send(destination, msg) {
        (async (destination, msg) => {
            if (/\.i2p$/.test(destination)) {
                destination = await this.resolve(destination);
            }
            const s = msg.toString('base64');
            if (s.length < MIN_UDP_MESSAGE_LENGTH) {
                return this.emit('error', new Error('I2pSamRaw.send(): message length < MIN_UDP_MESSAGE_LENGTH'));
            }
            else if (s.length > MAX_UDP_MESSAGE_LENGTH) {
                return this.emit('error', new Error('I2pSamRaw.send(): message length > MAX_UDP_MESSAGE_LENGTH'));
            }
            this.socketControlUDP.send(`3.0 ${this.config.session.id} ${destination}\n` + s, this.config.sam.portUDP, this.config.sam.host, (error) => {
                error && this.emit('error', error);
            });
        })(destination, msg);
    }
}
exports.I2pSamRaw = I2pSamRaw;
