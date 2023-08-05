import { I2pSamRaw } from './i2p-sam-raw.js';
import { clearTimeout } from 'timers';
export class I2pSamDatagram extends I2pSamRaw {
    static async createDatagram(c) {
        return await I2pSamDatagram.make(c);
    }
    static async make(c) {
        const r = new I2pSamDatagram(c);
        await r.open();
        return await new Promise((resolve, reject) => {
            (async (r) => {
                const t = setTimeout(() => {
                    reject(new Error('I2pSamDatagram timeout'));
                }, r.timeout * 1000);
                try {
                    await r.initSession();
                    clearTimeout(t);
                    resolve(r);
                }
                catch (error) {
                    reject(error);
                }
            })(r);
        });
    }
    constructor(c) {
        super(c);
        this.isReplyAble = true;
    }
    async initSession() {
        await super.initSession('DATAGRAM');
        return this;
    }
}
//# sourceMappingURL=i2p-sam-datagram.js.map