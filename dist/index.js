"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toB32 = exports.I2PSAMRaw = exports.I2PSAMStream = void 0;
const i2p_sam_stream_1 = require("./i2p-sam-stream");
const i2p_sam_raw_1 = require("./i2p-sam-raw");
const i2p_sam_1 = require("./i2p-sam");
const I2PSAMStream = async (c) => {
    return i2p_sam_stream_1.I2pSamStream.make(c);
};
exports.I2PSAMStream = I2PSAMStream;
const I2PSAMRaw = async (c) => {
    return i2p_sam_raw_1.I2pSamRaw.make(c);
};
exports.I2PSAMRaw = I2PSAMRaw;
const toB32 = (s) => {
    return i2p_sam_1.I2pSam.toB32(s);
};
exports.toB32 = toB32;
