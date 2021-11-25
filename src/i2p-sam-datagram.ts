/**
 * MIT License - Copyright (c) 2021 diva.exchange
 *
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

import { I2pSamRaw } from './i2p-sam-raw';
import { Configuration } from './config';

export class I2pSamDatagram extends I2pSamRaw {
  static async make(c: Configuration): Promise<I2pSamDatagram> {
    const r = new I2pSamDatagram(c);
    await r.open();
    await r.initSession();
    return r;
  }

  protected async initSession(): Promise<I2pSamDatagram> {
    await super.initSession('DATAGRAM');
    return this;
  }
}
