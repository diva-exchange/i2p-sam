"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.I2pSamStream = void 0;
const net_1 = require("net");
const i2p_sam_1 = require("./i2p-sam");
class I2pSamStream extends i2p_sam_1.I2pSam {
    constructor() {
        super(...arguments);
        this.socketStream = {};
        this.destination = '';
        this.hasStream = false;
    }
    static async make(c) {
        const r = new I2pSamStream(c);
        await r.open();
        await r.initSession('STREAM');
        await r.connect();
        return r;
    }
    async open() {
        await super.open();
        this.socketStream = new net_1.Socket();
        this.socketStream.on('data', (data) => {
            if (this.hasStream) {
                this.config.stream.onMessage && this.config.stream.onMessage(data);
            }
            else {
                this.parseReply(data);
            }
        });
        this.socketStream.on('error', (error) => {
            this.eventEmitter.emit('error', error);
        });
        this.socketStream.on('close', () => {
            this.hasStream = false;
            this.config.stream.onClose && this.config.stream.onClose();
        });
        await this.hello(this.socketStream);
        return Promise.resolve(this);
    }
    async connect() {
        this.destination = this.config.stream.destination || '';
        if (!this.destination) {
            throw new Error('Stream destination empty');
        }
        return new Promise((resolve, reject) => {
            this.eventEmitter.removeAllListeners('error');
            this.eventEmitter.once('error', reject);
            this.eventEmitter.removeAllListeners('stream');
            this.eventEmitter.once('stream', () => {
                this.hasStream = true;
                resolve();
            });
            const s = `STREAM CONNECT SILENT=false ID=${this.config.session.id} DESTINATION=${this.destination}\n`;
            this.socketStream.write(s, (error) => {
                error && this.eventEmitter.emit('error', error);
            });
        });
    }
    send(msg) {
        this.socketStream.write(msg, (error) => {
            error && this.eventEmitter.emit('error', error);
        });
    }
}
exports.I2pSamStream = I2pSamStream;
