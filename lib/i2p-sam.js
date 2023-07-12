import { base32 } from 'rfc4648';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { Config } from './config.js';
import { Socket } from 'net';
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
export class I2pSam extends EventEmitter {
    constructor(c) {
        super();
        this.socketControl = {};
        this.config = new Config(c);
        this.publicKey = this.config.sam.publicKey || '';
        this.privateKey = this.config.sam.privateKey || '';
        this.internalEventEmitter = new EventEmitter();
    }
    async open() {
        this.socketControl = new Socket();
        this.socketControl.on('data', (data) => {
            this.parseReply(data);
        });
        this.socketControl.on('close', () => {
            this.emit('close');
        });
        try {
            await new Promise((resolve, reject) => {
                this.socketControl.once('error', reject);
                this.socketControl.connect({ host: this.config.sam.host, port: this.config.sam.portTCP }, () => {
                    this.socketControl.removeAllListeners('error');
                    this.socketControl.on('error', (error) => {
                        this.emit('error', error);
                    });
                    resolve(true);
                });
            });
            await this.hello(this.socketControl);
            if (!this.publicKey || !this.privateKey) {
                await this.generateDestination();
            }
            return Promise.resolve(this);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    close() {
        this.socketControl.destroy();
    }
    async hello(socket) {
        return new Promise((resolve, reject) => {
            const min = this.config.sam.versionMin || false;
            const max = this.config.sam.versionMax || false;
            this.internalEventEmitter.removeAllListeners();
            this.internalEventEmitter.once('error', reject);
            this.internalEventEmitter.once('hello', resolve);
            socket.write(`HELLO VERSION${min ? ' MIN=' + min : ''}${max ? ' MAX=' + max : ''}\n`, (error) => {
                error && reject(error);
            });
        });
    }
    async initSession(type) {
        return new Promise((resolve, reject) => {
            let s = `SESSION CREATE ID=${this.config.session.id} DESTINATION=${this.privateKey} `;
            switch (type) {
                case 'STREAM':
                    s += 'STYLE=STREAM';
                    break;
                case 'DATAGRAM':
                case 'RAW':
                    s += `STYLE=${type} PORT=${this.config.listen.portForward} HOST=${this.config.listen.hostForward}`;
                    break;
            }
            this.internalEventEmitter.removeAllListeners();
            this.internalEventEmitter.once('error', reject);
            this.internalEventEmitter.once('session', resolve);
            s += (this.config.session.options ? ' ' + this.config.session.options : '') + '\n';
            this.socketControl.write(s, (error) => {
                error && reject(error);
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
                    ? this.internalEventEmitter.emit('error', new Error('HELLO failed: ' + sData))
                    : this.internalEventEmitter.emit('hello');
            case REPLY_DEST:
                this.publicKey = oKeyValue[KEY_PUB] || '';
                this.privateKey = oKeyValue[KEY_PRIV] || '';
                return !this.publicKey || !this.privateKey
                    ? this.internalEventEmitter.emit('error', new Error('DEST failed: ' + sData))
                    : this.internalEventEmitter.emit('destination');
            case REPLY_SESSION:
                return oKeyValue[KEY_RESULT] !== VALUE_OK || !(oKeyValue[KEY_DESTINATION] || '')
                    ? this.internalEventEmitter.emit('error', new Error('SESSION failed: ' + sData))
                    : this.internalEventEmitter.emit('session', this);
            case REPLY_NAMING:
                return oKeyValue[KEY_RESULT] !== VALUE_OK
                    ? this.internalEventEmitter.emit('error', new Error('NAMING failed: ' + sData))
                    : this.internalEventEmitter.emit('naming', oKeyValue[KEY_VALUE]);
            case REPLY_STREAM:
                return oKeyValue[KEY_RESULT] !== VALUE_OK
                    ? this.internalEventEmitter.emit('error', new Error('STREAM failed: ' + sData))
                    : this.internalEventEmitter.emit('stream');
            default:
                return;
        }
    }
    static parseReplyKeyValue(data) {
        const [...args] = data.split(' ');
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
            this.internalEventEmitter.removeAllListeners();
            this.internalEventEmitter.once('error', reject);
            this.internalEventEmitter.once('destination', resolve);
            this.socketControl.write('DEST GENERATE\n', (error) => {
                error && this.internalEventEmitter.emit('error', error);
            });
        });
    }
    async resolve(name) {
        return new Promise((resolve, reject) => {
            if (!/\.i2p$/.test(name)) {
                reject(new Error('Invalid I2P address: ' + name));
            }
            this.internalEventEmitter.removeAllListeners();
            this.internalEventEmitter.once('error', reject);
            this.internalEventEmitter.once('naming', resolve);
            this.socketControl.write(`NAMING LOOKUP NAME=${name}\n`, (error) => {
                error && this.internalEventEmitter.emit('error', error);
            });
        });
    }
    getB32Address() {
        return I2pSam.toB32(this.publicKey) + '.b32.i2p';
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
        return base32.stringify(crypto.createHash('sha256').update(s).digest(), { pad: false }).toLowerCase();
    }
    static async createLocalDestination(c) {
        const sam = new I2pSam(c);
        await sam.open();
        sam.close();
        return { address: sam.getB32Address(), public: sam.getPublicKey(), private: sam.getPrivateKey() };
    }
    static async lookup(c, address) {
        const sam = new I2pSam(c);
        await sam.open();
        const s = await sam.resolve(address);
        sam.close();
        return s;
    }
}
//# sourceMappingURL=i2p-sam.js.map