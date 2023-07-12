import { I2pSamRaw } from './i2p-sam-raw.js';
export class I2pSamDatagram extends I2pSamRaw {
    static async createDatagram(c) {
        return await I2pSamDatagram.make(c);
    }
    static async make(c) {
        const r = new I2pSamDatagram(c);
        await r.open();
        await r.initSession();
        return r;
    }
    async initSession() {
        await super.initSession('DATAGRAM');
        return this;
    }
}
//# sourceMappingURL=i2p-sam-datagram.js.map