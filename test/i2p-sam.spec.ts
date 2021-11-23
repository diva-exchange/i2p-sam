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
import { I2PSAMRaw, toB32, createLocalDestination, lookup } from '../src';
import { I2pSamRaw } from '../src/i2p-sam-raw';

const SAM_HOST = process.env.SAM_HOST || '172.19.74.11';
const SAM_PORT_TCP = Number(process.env.SAM_PORT_TCP || 7656);
const SAM_PORT_UDP = Number(process.env.SAM_PORT_UDP || 7655);

@suite
class TestI2pSamBaseClass {
  @test
  toB32() {
    expect(
      toB32(
        '-hX6726R7xIX0Bvb9eKZlADgwCquImj8950Sy1zrrJK5kMFd0jHXXD3ky8iWLYmRi-MN3obBC2z4s0E1Bsl~EfVtWEAou9dlK7OnW9pbDIxQu6p1yRPBzHNdBM5jTWplZkx5VBL63FsjhIpDRBhTqGUaLFyT40jwD92ks4uAUpZkQwTeNmc9pbWAro6T2SXgVdDTF5U~8Hk9N~-126hlfATDikoPjUiFr0KD1Yi5~ufWxTwzifHwYmb6SGcBUiKc9L8wFuPOAchH33vBTmAGBoyhZkhWLRjIiQKpE9U5W4LcnrLs2rB40c5F0--esAKUCHA59I~FQXtzbtSbHoFVvYjIHJNGp6UP-CmJWCJs2be9XVI5ltFaiKK6qH7n3p0vKfiJeh43CqKaubX5s93LXNsl~qlil~92T~58FRL36-4FpfXo0AoSJiGgG3kvnB7cJoI2Owjw5oRE7UoXHLFXr8MUpBYqAcsCt3d1tsoHfA1r2bNSuITynWJUWYBDMTocBQAEAAcAAA=='
      )
    ).to.be.eq('z3v47ifwlen474b5aprlf52k6ixa5fpnu5aamuxnulr2qhagrvmq');
  }

  @test
  async createLocalDestination() {
    const obj = await createLocalDestination({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
    });

    expect(obj.address).not.to.be.empty;
    expect(obj.public).not.to.be.empty;
    expect(obj.private).not.to.be.empty;
  }

  @test
  @timeout(120000)
  @slow(120000)
  async keys() {
    const sam: I2pSamRaw = await I2PSAMRaw({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
    });

    const pair = sam.getKeyPair();
    expect(pair.public).to.be.eq(sam.getPublicKey());
    expect(pair.private).to.be.eq(sam.getPrivateKey());
    expect(sam.getLocalDestination()).to.be.eq(pair.public);
    expect(sam.getLocalDestinationAsB32Address()).not.to.be.empty;
  }

  @test
  async lookup() {
    const s: string = await lookup({ sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } }, 'diva.i2p');
    expect(s).not.to.be.empty;

    try {
      await lookup({ sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } }, 'diva.bogus');
      expect(false).to.be.true;
    } catch (error) {
      expect(true).to.be.true;
    }
  }

  @test
  @timeout(10000)
  @slow(10000)
  async error() {
    try {
      await I2PSAMRaw({
        sam: {
          host: SAM_HOST,
          portTCP: SAM_PORT_TCP,
          portUDP: SAM_PORT_UDP,
          versionMin: '9.0',
          versionMax: '0.0',
        },
      });
      expect(false).to.be.true;
    } catch (error) {
      expect(true).to.be.true;
    }

    // connection error
    try {
      await I2PSAMRaw({
        sam: {
          host: '127.0.0.256',
          portTCP: SAM_PORT_TCP,
          portUDP: SAM_PORT_UDP,
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
