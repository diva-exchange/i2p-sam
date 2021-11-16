"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.I2PSAMRaw = void 0;
const i2p_sam_raw_1 = require("./src/i2p-sam-raw");
const I2PSAMRaw = async (c = {}) => {
    return i2p_sam_raw_1.I2pSamRaw.make(c);
};
exports.I2PSAMRaw = I2PSAMRaw;
