"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.I2pSam = void 0;
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
            if (this.config.sam.onError) {
                this.config.sam.onError(error);
            }
            else {
                throw error;
            }
        });
        this.socketControl.on('close', () => {
            this.config.sam.onClose && this.config.sam.onClose();
        });
        return new Promise((resolve, reject) => {
            this.socketControl.connect({ host: this.config.sam.hostControl, port: this.config.sam.portControlTCP }, async () => {
                try {
                    await this.hello();
                    resolve(this);
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    async hello() {
        return new Promise((resolve, reject) => {
            this.eventEmitter.once('hello', () => {
                resolve();
            });
            this.eventEmitter.once('error', (error) => {
                reject(error);
            });
            const min = this.config.sam.versionMin || false;
            const max = this.config.sam.versionMax || false;
            this.socketControl.write(`HELLO VERSION${min ? ' MIN=' + min : ''}${max ? ' MAX=' + max : ''}\n`);
        });
    }
    async lookup(name) {
        return new Promise((resolve, reject) => {
            if (!/\.i2p$/.test(name)) {
                reject(new Error('Invalid lookup name: ' + name));
            }
            this.eventEmitter.once('naming', (result) => {
                resolve(result);
            });
            this.eventEmitter.once('error', (error) => {
                reject(error);
            });
            this.socketControl.write(`NAMING LOOKUP NAME=${name}\n`);
        });
    }
    async generateDestination() {
        this.publicKey = '';
        this.privateKey = '';
        this.socketControl.write('DEST GENERATE SIGNATURE_TYPE=EdDSA_SHA512_Ed25519\n');
    }
    me() {
        return this.publicKey;
    }
    parseReply(data) {
        const sData = data.toString().trim();
        const [c, s] = sData.split(' ');
        const oKeyValue = I2pSam.parseReplyKeyValue(sData);
        switch (c + s) {
            case REPLY_HELLO:
                return oKeyValue[KEY_RESULT] === VALUE_OK
                    ? this.eventEmitter.emit('hello')
                    : this.eventEmitter.emit('error', new Error('HELLO failed: ' + sData));
            case REPLY_DEST:
                this.publicKey = oKeyValue[KEY_PUB] || '';
                this.privateKey = oKeyValue[KEY_PRIV] || '';
                return this.publicKey && this.privateKey
                    ? this.eventEmitter.emit('destination')
                    : this.eventEmitter.emit('error', new Error('DEST failed: ' + sData));
            case REPLY_SESSION:
                return oKeyValue[KEY_RESULT] === VALUE_OK && oKeyValue[KEY_DESTINATION]
                    ? this.eventEmitter.emit('session', oKeyValue[KEY_DESTINATION])
                    : this.eventEmitter.emit('error', new Error('SESSION failed: ' + sData));
            case REPLY_NAMING:
                return oKeyValue[KEY_RESULT] === VALUE_OK && oKeyValue[KEY_VALUE]
                    ? this.eventEmitter.emit('naming', oKeyValue[KEY_VALUE])
                    : this.eventEmitter.emit('error', new Error('NAMING failed: ' + sData));
            case REPLY_STREAM:
                this.eventEmitter.emit('stream-status', oKeyValue);
                return this.eventEmitter.emit('stream-accept', oKeyValue);
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
}
exports.I2pSam = I2pSam;
