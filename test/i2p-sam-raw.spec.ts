/**
 * Copyright (C) 2021 diva.exchange
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

import { suite, test, slow, timeout } from '@testdeck/mocha';
import { expect } from 'chai';
import { I2PSAMRaw } from '../i2psam';
import { I2pSamRaw } from '../src/i2p-sam-raw';

@suite
class TestI2pSamRaw {
  @test
  @timeout(160000)
  @slow(120000)
  async send() {
    let messageCounterA = 0;
    let messageCounterB = 0;
    const arrayPerformanceA: Array<number> = [];
    const arrayPerformanceB: Array<number> = [];

    console.log('Creating Sender...');
    const i2pSender: I2pSamRaw = await I2PSAMRaw({
      listen: {
        address: '0.0.0.0',
        port: 20211,
        hostForward: '172.19.74.1',
        onMessage: (msg: Buffer) => {
          messageCounterA++;
          arrayPerformanceA.push(Date.now() - Number(msg.toString()));
        },
      },
      sam: { hostControl: '172.19.74.11', portControlTCP: 7656, portControlUDP: 7655 },
    });

    console.log('Creating Recipient...');
    const i2pRecipient: I2pSamRaw = await I2PSAMRaw({
      listen: {
        address: '0.0.0.0',
        port: 20212,
        hostForward: '172.19.74.1',
        onMessage: (msg: Buffer) => {
          messageCounterB++;
          arrayPerformanceB.push(Date.now() - Number(msg.toString()));
        },
      },
      sam: { hostControl: '172.19.74.12', portControlTCP: 7656, portControlUDP: 7655 },
    });

    console.log('Start sending data...');

    // send some data to diva.i2p
    await i2pSender.send('diva.i2p', Buffer.from(Date.now().toString()));

    const publicKey1 = i2pRecipient.getPublicKey();
    setInterval(async () => {
      await i2pSender.send(publicKey1, Buffer.from(Date.now().toString()));
    }, 1000);

    const publicKey2 = i2pSender.getPublicKey();
    setInterval(async () => {
      await i2pRecipient.send(publicKey2, Buffer.from(Date.now().toString()));
    }, 1000);

    await TestI2pSamRaw.wait(60000);

    console.log('messageCounterA ' + messageCounterA);
    console.log(arrayPerformanceA);
    console.log('messageCounterB ' + messageCounterB);
    console.log(arrayPerformanceB);

    expect(messageCounterA).not.to.be.equal(0);
    expect(messageCounterB).not.to.be.equal(0);
  }

  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
