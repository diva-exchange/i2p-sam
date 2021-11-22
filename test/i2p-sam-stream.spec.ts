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
import { I2PSAMStream } from '../src';
import { I2pSamStream } from '../src/i2p-sam-stream';

@suite
class TestI2pSamStream {
  @test
  @timeout(90000)
  @slow(90000)
  async send() {
    let messageCounter = 0;

    console.log('Creating Stream...');
    const i2pSender: I2pSamStream = await I2PSAMStream({
      stream: {
        destination: 'diva.i2p',
        onMessage: () => {
          messageCounter++;
        },
      },
      sam: { host: '172.19.74.11', portTCP: 7656 },
    });

    console.log('Start sending data...');

    // send some data to diva.i2p
    i2pSender.send(Buffer.from('GET / HTTP/1.1\r\nHost: diva.i2p\r\n\r\n'));
    while (!messageCounter) {
      await TestI2pSamStream.wait(1000);
    }

    expect(messageCounter).not.to.be.equal(0);
  }

  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
