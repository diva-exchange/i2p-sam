"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const i2p_sam_1 = require("./i2p-sam");
class I2pSamStream extends i2p_sam_1.I2pSam {
    constructor(c) {
        super(c);
        this.socketAccept = net_1.default.createConnection({ host: this.config.sam.hostControl, port: this.config.sam.portControlTCP }, async () => {
            await this.hello();
            await this.accept();
        });
        this.socketAccept.on('error', (error) => {
            if (this.config.sam.onError) {
                this.config.sam.onError(error);
            }
            else {
                throw error;
            }
        });
        this.socketAccept.on('data', (data) => {
            this.incoming(data);
        });
        this.socketAccept.on('close', () => {
            console.log(`Connection to SAM (${this.config.sam.hostControl}:${this.config.sam.portControlTCP}) closed`);
        });
    }
    static async make(c) {
        const r = new I2pSamStream(c);
        return await r.stream();
    }
    async stream() {
        this.socketControl.write(`SESSION CREATE STYLE=STREAM ID=${this.config.session.id} DESTINATION=TRANSIENT\n`);
        return this;
    }
    async accept() {
        this.socketAccept.write(`SESSION ACCEPT ID=accept_${this.config.session.id}\n`);
        return this;
    }
    incoming(data) {
        console.log(data.toString());
        this.config.listen.onMessage && this.config.listen.onMessage(data);
    }
}
