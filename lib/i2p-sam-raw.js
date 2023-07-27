import { I2pSam } from './i2p-sam.js';
import dgram from 'dgram';
import zlib from 'zlib';
const MIN_UDP_MESSAGE_LENGTH = 1;
const MAX_UDP_MESSAGE_LENGTH = 32768;
export class I2pSamRaw extends I2pSam {
    isReplyAble;
    socketControlUDP;
    socketListen;
    static async createRaw(c) {
        return await I2pSamRaw.make(c);
    }
    static async make(c) {
        const r = new I2pSamRaw(c);
        await r.open();
        await r.initSession();
        return r;
    }
    constructor(c) {
        super(c);
        this.isReplyAble = false;
        this.socketControlUDP = {};
        this.socketListen = {};
    }
    async open() {
        await super.open();
        this.socketControlUDP = dgram.createSocket({ type: 'udp4' });
        this.socketControlUDP.on('error', (error) => {
            this.emit('error', error);
        });
        if (!(this.config.listen.port || 0)) {
            return Promise.resolve(this);
        }
        this.socketListen = dgram.createSocket('udp4', (msg) => {
            try {
                let fromDestination = '';
                let message;
                if (this.isReplyAble) {
                    const i = msg.indexOf(10);
                    fromDestination = msg.subarray(0, i).toString();
                    message = msg.subarray(i + 1);
                }
                else {
                    message = msg;
                }
                this.emit('data', zlib.gunzipSync(message), fromDestination);
            }
            catch (error) {
                this.emit('error', error);
                return;
            }
        });
        this.socketListen.on('close', () => {
            this.emit('close');
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
        if (msg.byteLength < MIN_UDP_MESSAGE_LENGTH || msg.byteLength > MAX_UDP_MESSAGE_LENGTH * 2) {
            this.emit('error', new Error('I2pSamRaw.send(): invalid message length'));
            return;
        }
        (async (destination, msg) => {
            if (/\.i2p$/.test(destination)) {
                destination = await this.resolve(destination);
            }
            const s = zlib.gzipSync(msg);
            if (s.byteLength > MAX_UDP_MESSAGE_LENGTH) {
                this.emit('error', new Error(`I2pSamRaw.send(): message length > MAX_UDP_MESSAGE_LENGTH (${MAX_UDP_MESSAGE_LENGTH})`));
            }
            else {
                try {
                    this.socketControlUDP.send(Buffer.concat([Buffer.from(`3.0 ${this.config.session.id} ${destination}\n`), s]), this.config.sam.portUDP, this.config.sam.host, (error) => {
                        error && this.emit('error', error);
                    });
                }
                catch (error) {
                    this.emit('error', new Error(error.toString()));
                }
            }
        })(destination, msg);
    }
}
//# sourceMappingURL=i2p-sam-raw.js.map