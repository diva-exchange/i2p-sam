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
import { I2pSamRaw, I2PSAMRaw } from '../src/i2p-sam-raw';

@suite
class TestI2pSamRaw {
/*
  @test
  async factoryFail() {
    try {
      I2PSAMRaw();
      expect(false).to.be.true;
    } catch (error) {
      expect(true).to.be.true;
    }
  }
*/

  @test
  @timeout(70000)
  @slow(70000)
  async factory() {
    const i2p = await I2PSAMRaw({
      session: { id: 'test' },
      listen: { host: '0.0.0.0', port: 20211 },
      sam: { hostControl: '172.19.74.11', portControlTCP: 7656, portControlUDP: 7655 },
    });

    expect(i2p).to.be.an.instanceof(I2pSamRaw);
  }
}
