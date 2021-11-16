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

@suite
class TestI2pSamBaseClass {
  @test
  @timeout(60000)
  @slow(30000)
  async generateDestination() {
    const sam = await I2PSAMRaw({
      sam: { hostControl: '172.19.74.11', portControlTCP: 7656, portControlUDP: 7655 },
    });

    const pair = sam.getKeyPair();
    expect(pair.public).not.to.be.empty;
    expect(pair.private).not.to.be.empty;
  }

  @test
  @timeout(60000)
  @slow(30000)
  async lookup() {
    const sam = await I2PSAMRaw({
      sam: { hostControl: '172.19.74.11', portControlTCP: 7656, portControlUDP: 7655 },
    });

    const s: string = await sam.lookup('diva.i2p');
    expect(s).not.to.be.empty;

    try {
      await sam.lookup('diva.bogus');
      expect(false).to.be.true;
    } catch (error) {
      expect(true).to.be.true;
    }
  }

  @test
  @timeout(60000)
  @slow(30000)
  async error() {
    try {
      await I2PSAMRaw({
        sam: {
          hostControl: '172.19.74.11',
          portControlTCP: 7656,
          portControlUDP: 7655,
          versionMin: '9.0',
          versionMax: '0.0',
        },
      });
      expect(false).to.be.true;
    } catch (error) {
      expect(true).to.be.true;
    }
  }
}
