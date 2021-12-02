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
        this.hostForward = '';
        this.portForward = 0;
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
        this.destination = this.config.stream.destination || '';
        this.hostForward = this.config.forward.host || '';
        this.portForward = this.config.forward.port || 0;
        if (!(this.hostForward && this.portForward > 0) && !this.destination) {
            throw new Error('Stream configuration invalid');
        }
        this.socketStream = new net_1.Socket();
        this.socketStream.on('data', (data) => {
            if (this.hasStream) {
                this.emit('data', data);
            }
            else {
                this.parseReply(data);
            }
        });
        this.socketStream.on('close', () => {
            this.emit('close');
        });
        this.socketStream.connect({ host: this.config.sam.host, port: this.config.sam.portTCP }, () => {
            this.socketStream.removeAllListeners('error');
            this.socketStream.on('error', (error) => {
                this.emit('error', error);
            });
        });
        await this.hello(this.socketStream);
        return Promise.resolve(this);
    }
    close() {
        this.socketStream.destroy();
        super.close();
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.internalEventEmitter.removeAllListeners();
            this.internalEventEmitter.once('error', reject);
            this.internalEventEmitter.once('stream', () => {
                this.hasStream = true;
                resolve();
            });
            let s = '';
            if (this.destination) {
                s = `STREAM CONNECT SILENT=false ID=${this.config.session.id} DESTINATION=${this.destination}\n`;
            }
            else {
                s =
                    'STREAM FORWARD ' +
                        `SILENT=${this.config.forward.silent ? 'true' : 'false'} ` +
                        `ID=${this.config.session.id} PORT=${this.portForward} HOST=${this.hostForward}\n`;
            }
            this.socketStream.write(s, (error) => {
                error && this.internalEventEmitter.emit('error', error);
            });
        });
    }
    stream(msg) {
        this.socketStream.write(msg, (error) => {
            error && this.emit('error', error);
        });
    }
}
exports.I2pSamStream = I2pSamStream;
