"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.I2pSamDatagram = void 0;
const i2p_sam_raw_1 = require("./i2p-sam-raw");
class I2pSamDatagram extends i2p_sam_raw_1.I2pSamRaw {
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
exports.I2pSamDatagram = I2pSamDatagram;
