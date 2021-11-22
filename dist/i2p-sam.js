"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.I2pSam = void 0;
const rfc4648_1 = require("rfc4648");
const crypto_1 = __importDefault(require("crypto"));
const events_1 = require("events");
const config_1 = require("./config");
const net_1 = require("net");
const REPLY_HELLO = 'HELLOREPLY';
const REPLY_DEST = 'DESTREPLY';
const REPLY_SESSION = 'SESSIONSTATUS';
const REPLY_NAMING = 'NAMINGREPLY';
const REPLY_STREAM = 'STREAMSTATUS';
const KEY_RESULT = 'RESULT';
const KEY_PUB = 'PUB';
const KEY_PRIV = 'PRIV';
const KEY_DESTINATION = 'DESTINATION';
const KEY_VALUE = 'VALUE';
const VALUE_OK = 'OK';
class I2pSam {
    constructor(c) {
        this.socketControl = {};
        this.publicKey = '';
        this.privateKey = '';
        this.config = new config_1.Config(c);
        this.eventEmitter = new events_1.EventEmitter();
    }
    async open() {
        this.socketControl = new net_1.Socket();
        this.socketControl.on('data', (data) => {
            this.parseReply(data);
        });
        this.socketControl.on('error', (error) => {
            this.eventEmitter.emit('error', error);
        });
        this.socketControl.on('close', () => {
            this.config.sam.onClose && this.config.sam.onClose();
        });
        await this.hello(this.socketControl);
        if (!this.config.sam.publicKey || !this.config.sam.privateKey) {
            await this.generateDestination();
        }
        return Promise.resolve(this);
    }
    async hello(socket) {
        return new Promise((resolve, reject) => {
            const min = this.config.sam.versionMin || false;
            const max = this.config.sam.versionMax || false;
            this.eventEmitter.removeAllListeners('error');
            this.eventEmitter.once('error', reject);
            this.eventEmitter.removeAllListeners('hello');
            this.eventEmitter.once('hello', resolve);
            socket.connect({ host: this.config.sam.host, port: this.config.sam.portTCP }, () => {
                socket.write(`HELLO VERSION${min ? ' MIN=' + min : ''}${max ? ' MAX=' + max : ''}\n`, (error) => {
                    error && this.eventEmitter.emit('error', error);
                });
            });
        });
    }
    async initSession(type) {
        return new Promise((resolve, reject) => {
            let s = `SESSION CREATE ID=${this.config.session.id} DESTINATION=${this.privateKey} `;
            switch (type) {
                case 'STREAM':
                    s += 'STYLE=STREAM\n';
                    break;
                case 'RAW':
                    s += `STYLE=RAW PORT=${this.config.listen.portForward} HOST=${this.config.listen.hostForward}\n`;
                    break;
            }
            this.eventEmitter.removeAllListeners('error');
            this.eventEmitter.once('error', reject);
            this.eventEmitter.removeAllListeners('session');
            this.eventEmitter.once('session', (destination) => {
                this.publicKey = destination;
                resolve(this);
            });
            this.socketControl.write(s, (error) => {
                error && this.eventEmitter.emit('error', error);
            });
        });
    }
    parseReply(data) {
        const sData = data.toString().trim();
        const [c, s] = sData.split(' ');
        const oKeyValue = I2pSam.parseReplyKeyValue(sData);
        switch (c + s) {
            case REPLY_HELLO:
                return oKeyValue[KEY_RESULT] !== VALUE_OK
                    ? this.eventEmitter.emit('error', new Error('HELLO failed: ' + sData))
                    : this.eventEmitter.emit('hello');
            case REPLY_DEST:
                this.publicKey = oKeyValue[KEY_PUB] || '';
                this.privateKey = oKeyValue[KEY_PRIV] || '';
                return !this.publicKey || !this.privateKey
                    ? this.eventEmitter.emit('error', new Error('DEST failed: ' + sData))
                    : this.eventEmitter.emit('destination');
            case REPLY_SESSION:
                return oKeyValue[KEY_RESULT] !== VALUE_OK
                    ? this.eventEmitter.emit('error', new Error('SESSION failed: ' + sData))
                    : this.eventEmitter.emit('session', oKeyValue[KEY_DESTINATION]);
            case REPLY_NAMING:
                return oKeyValue[KEY_RESULT] !== VALUE_OK
                    ? this.eventEmitter.emit('error', new Error('NAMING failed: ' + sData))
                    : this.eventEmitter.emit('naming', oKeyValue[KEY_VALUE]);
            case REPLY_STREAM:
                return oKeyValue[KEY_RESULT] !== VALUE_OK
                    ? this.eventEmitter.emit('error', new Error('STREAM failed: ' + sData))
                    : this.eventEmitter.emit('stream');
            default:
                return;
        }
    }
    static parseReplyKeyValue(data) {
        const [...args] = data.toString().split(' ');
        const objResult = {};
        for (const s of args.filter((s) => s.indexOf('=') > -1)) {
            const [k, v] = s.split('=');
            objResult[k.trim()] = v.trim();
        }
        return objResult;
    }
    async generateDestination() {
        this.publicKey = '';
        this.privateKey = '';
        return new Promise((resolve, reject) => {
            this.eventEmitter.removeAllListeners('error');
            this.eventEmitter.once('error', reject);
            this.eventEmitter.removeAllListeners('destination');
            this.eventEmitter.once('destination', resolve);
            this.socketControl.write('DEST GENERATE\n', (error) => {
                error && this.eventEmitter.emit('error', error);
            });
        });
    }
    async lookup(name) {
        return new Promise((resolve, reject) => {
            if (!/\.i2p$/.test(name)) {
                reject(new Error('Invalid lookup name: ' + name));
            }
            this.eventEmitter.removeAllListeners('error');
            this.eventEmitter.once('error', reject);
            this.eventEmitter.removeAllListeners('naming');
            this.eventEmitter.once('naming', resolve);
            this.socketControl.write(`NAMING LOOKUP NAME=${name}\n`, (error) => {
                error && this.eventEmitter.emit('error', error);
            });
        });
    }
    getPublicKey() {
        return this.publicKey;
    }
    getPrivateKey() {
        return this.privateKey;
    }
    getKeyPair() {
        return {
            public: this.getPublicKey(),
            private: this.getPrivateKey(),
        };
    }
    static toB32(base64Destination) {
        const s = Buffer.from(base64Destination.replace(/-/g, '+').replace(/~/g, '/'), 'base64');
        return rfc4648_1.base32.stringify(crypto_1.default.createHash('sha256').update(s).digest(), { pad: false }).toLowerCase();
    }
}
exports.I2pSam = I2pSam;
