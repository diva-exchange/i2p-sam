import { I2pSam } from './i2p-sam.js';
import dgram from 'dgram';
const MIN_UDP_MESSAGE_LENGTH = 1;
const MAX_UDP_MESSAGE_LENGTH = 31744;
export class I2pSamRaw extends I2pSam {
    socketControlUDP = {};
    socketListen = {};
    static async createRaw(c) {
        return await I2pSamRaw.make(c);
    }
    static async make(c) {
        const r = new I2pSamRaw(c);
        await r.open();
        await r.initSession();
        return r;
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
                let [fromDestination, message] = msg.toString().split('\n');
                if (!message) {
                    message = fromDestination;
                    fromDestination = '';
                }
                this.emit('data', Buffer.from(message, 'base64'), fromDestination);
            }
            catch (error) {
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
            try {
                this.socketControlUDP.send(`3.0 ${this.config.session.id} ${destination}\n` + s, this.config.sam.portUDP, this.config.sam.host, (error) => {
                    error && this.emit('error', error);
                });
            }
            catch (error) {
                return this.emit('error', new Error(error.toString()));
            }
        })(destination, msg);
    }
}
//# sourceMappingURL=i2p-sam-raw.js.map