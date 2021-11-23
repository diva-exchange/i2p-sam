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
import { I2PSAMRaw } from '../src';
import { I2pSamRaw } from '../src/i2p-sam-raw';

@suite
class TestI2pSamRaw {
  @test
  @timeout(120000)
  @slow(120000)
  async send() {
    let messageCounterA = 0;
    let messageCounterB = 0;
    const arrayPerformanceA: Array<number> = [];
    const arrayPerformanceB: Array<number> = [];

    let destinationSender = '';
    let destinationRecipient = '';

    console.log('Creating Sender...');
    I2PSAMRaw({
      listen: {
        address: '0.0.0.0',
        port: 20211,
        hostForward: '172.19.74.1',
        onMessage: (msg: Buffer) => {
          messageCounterA++;
          arrayPerformanceA.push(Date.now() - Number(msg.toString()));
        },
      },
      sam: { host: '172.19.74.11', portTCP: 7656 },
    }).then((i2pSender: I2pSamRaw) => {
      destinationSender = i2pSender.getLocalDestination();

      // send some data to diva.i2p
      i2pSender.send('diva.i2p', Buffer.from(Date.now().toString()));

      setInterval(async () => {
        destinationRecipient && i2pSender.send(destinationRecipient, Buffer.from(Date.now().toString()));
      }, 1000);
    });

    console.log('Creating Recipient...');
    I2PSAMRaw({
      listen: {
        address: '0.0.0.0',
        port: 20212,
        hostForward: '172.19.74.1',
        onMessage: (msg: Buffer) => {
          messageCounterB++;
          arrayPerformanceB.push(Date.now() - Number(msg.toString()));
        },
      },
      sam: { host: '172.19.74.11', portTCP: 7656 },
    }).then((i2pRecipient: I2pSamRaw) => {
      destinationRecipient = i2pRecipient.getLocalDestination();

      setInterval(async () => {
        destinationSender && i2pRecipient.send(destinationSender, Buffer.from(Date.now().toString()));
      }, 1000);
    });

    console.log('Start sending data...');

    while (messageCounterA < 10 || messageCounterB < 10) {
      await TestI2pSamRaw.wait(1000);
    }

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
