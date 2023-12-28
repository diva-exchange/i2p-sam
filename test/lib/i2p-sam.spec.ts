/**
 * Copyright 2021-2023 diva.exchange
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Author/Maintainer: DIVA.EXCHANGE Association, https://diva.exchange
 */

import { suite, test, timeout } from '@testdeck/mocha';
import { expect } from 'chai';
import { toB32, createLocalDestination, lookup, createRaw, I2pSamRaw, Configuration } from '../../lib/index.js';

const SAM_HOST: string = process.env.SAM_HOST || '172.19.74.11';
const SAM_PORT_TCP: number = Number(process.env.SAM_PORT_TCP || 7656);
const SAM_PORT_UDP: number = Number(process.env.SAM_PORT_UDP || 7655);

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
  async createLocalDestination(): Promise<void> {
    const obj = await createLocalDestination({ sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } });

    expect(obj.address).not.to.be.empty;
    expect(obj.public).not.to.be.empty;
    expect(obj.private).not.to.be.empty;
  }

  @test
  @timeout(300000)
  async keys(): Promise<void> {
    const sam: I2pSamRaw = await createRaw({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
    });

    const pair: { public: string; private: string } = sam.getKeyPair();
    expect(pair.public).to.be.eq(sam.getPublicKey());
    expect(pair.private).to.be.eq(sam.getPrivateKey());
    expect(sam.getB32Address()).not.to.be.empty;
  }

  @test
  @timeout(60000)
  async lookup(): Promise<void> {
    const s: string = await lookup({ sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } }, 'diva.i2p');
    expect(s).not.to.be.empty;

    try {
      await lookup({ sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } }, 'diva.bogus');
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('Invalid I2P address');
    }
  }

  @test
  async invalidConfig(): Promise<void> {
    try {
      await createRaw({
        sam: {
          timeout: 0,
        },
      } as Configuration);
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('ECONNREFUSED');
    }
  }

  @test
  async failVersion(): Promise<void> {
    // version error
    try {
      await createRaw({
        sam: {
          host: SAM_HOST,
          portTCP: SAM_PORT_TCP,
          portUDP: SAM_PORT_UDP,
          versionMin: '9.0',
          versionMax: '0.0',
        },
      });
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('HELLO failed').contains('RESULT=NOVERSION');
    }
  }

  @test
  async failKeys(): Promise<void> {
    // public key / private key issues
    try {
      await createRaw({
        sam: {
          host: SAM_HOST,
          portTCP: SAM_PORT_TCP,
          publicKey: '-',
          privateKey: '--',
        },
      });
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('SESSION failed').contains('RESULT=INVALID_KEY');
    }
  }

  @test
  async failConnect(): Promise<void> {
    // connection error
    try {
      await createRaw({
        sam: {
          host: '127.0.0.256',
          portTCP: SAM_PORT_TCP,
        },
      });
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('ENOTFOUND');
    }
  }
}
