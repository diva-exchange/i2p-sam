import { Socket } from 'net';
import { I2pSam } from './i2p-sam.js';
export class I2pSamStream extends I2pSam {
    constructor() {
        super(...arguments);
        this.socketStream = {};
        this.destination = '';
        this.hostForward = '';
        this.portForward = 0;
        this.hasStream = false;
    }
    static async createStream(c) {
        return await I2pSamStream.make(c);
    }
    static async createForward(c) {
        return await I2pSamStream.make(c);
    }
    static make(c) {
        return new Promise((resolve, reject) => {
            (async (s) => {
                const t = setTimeout(() => {
                    s.close();
                    reject(new Error(`Stream timeout (${s.timeout}s)`));
                }, s.timeout * 1000);
                try {
                    await s.open();
                    await s.initSession('STREAM');
                    await s.connect();
                    resolve(s);
                }
                catch (error) {
                    s.close();
                    reject(error);
                }
                finally {
                    clearTimeout(t);
                }
            })(new I2pSamStream(c));
        });
    }
    async open() {
        await super.open();
        this.destination = this.config.stream.destination || '';
        this.hostForward = this.config.forward.host || '';
        this.portForward = this.config.forward.port || 0;
        if (!(this.hostForward && this.portForward > 0) && !this.destination) {
            throw new Error('Stream configuration invalid');
        }
        this.socketStream = new Socket();
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
        return this;
    }
    close() {
        if (Object.keys(this.socketStream).length) {
            this.socketStream.destroy();
        }
        super.close();
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.internalEventEmitter.removeAllListeners();
            this.internalEventEmitter.once('error', (error) => reject(error));
            this.internalEventEmitter.once('stream', () => {
                this.hasStream = true;
                resolve();
            });
            let s;
            if (this.destination) {
                s = `STREAM CONNECT SILENT=false ID=${this.config.session.id} DESTINATION=${this.destination}\n`;
            }
            else {
                s =
                    'STREAM FORWARD ' +
                        `SILENT=${this.config.forward.silent ? 'true' : 'false'} ` +
                        `ID=${this.config.session.id} PORT=${this.portForward} HOST=${this.hostForward}\n`;
            }
            this.stream(Buffer.from(s));
        });
    }
    stream(msg) {
        this.socketStream.write(msg, (error) => {
            if (error) {
                this.emit('error', error || new Error('Failed to write to stream'));
            }
        });
    }
}
//# sourceMappingURL=i2p-sam-stream.js.map