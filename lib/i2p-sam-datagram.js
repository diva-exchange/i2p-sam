import { I2pSamRaw } from './i2p-sam-raw.js';
export class I2pSamDatagram extends I2pSamRaw {
    static async createDatagram(c) {
        return await I2pSamDatagram.make(c);
    }
    static make(c) {
        return new Promise((resolve, reject) => {
            (async (d) => {
                const t = setTimeout(() => {
                    d.close();
                    reject(new Error(`I2pSamDatagram timeout (${d.timeout}s)`));
                }, d.timeout * 1000);
                try {
                    await d.open();
                    await d.initSession();
                    resolve(d);
                }
                catch (error) {
                    d.close();
                    reject(error);
                }
                finally {
                    clearTimeout(t);
                }
            })(new I2pSamDatagram(c));
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