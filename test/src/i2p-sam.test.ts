/**
 * Copyright 2021-2025 diva.exchange
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

import { type Configuration } from '../../src/config.ts';
import { toB32, createLocalDestination, lookup } from '../../src/i2p-sam.ts';
import { type I2pSamRaw, createRaw } from '../../src/i2p-sam-raw.ts';
import { expect } from '@std/expect';

const SAM_HOST: string = Deno.env.get('SAM_HOST') || '172.19.74.11';
const SAM_PORT_TCP: number = Number(Deno.env.get('SAM_PORT_TCP') || 7656);
const SAM_PORT_UDP: number = Number(Deno.env.get('SAM_PORT_UDP') || 7655);

Deno.test('toB32', () => {
  expect(
    toB32(
      '-hX6726R7xIX0Bvb9eKZlADgwCquImj8950Sy1zrrJK5kMFd0jHXXD3ky8iWLYmRi-MN3obBC2z4s0E1Bsl~EfVtWEAou9dlK7OnW9pbDIxQu6p1yRPBzHNdBM5jTWplZkx5VBL63FsjhIpDRBhTqGUaLFyT40jwD92ks4uAUpZkQwTeNmc9pbWAro6T2SXgVdDTF5U~8Hk9N~-126hlfATDikoPjUiFr0KD1Yi5~ufWxTwzifHwYmb6SGcBUiKc9L8wFuPOAchH33vBTmAGBoyhZkhWLRjIiQKpE9U5W4LcnrLs2rB40c5F0--esAKUCHA59I~FQXtzbtSbHoFVvYjIHJNGp6UP-CmJWCJs2be9XVI5ltFaiKK6qH7n3p0vKfiJeh43CqKaubX5s93LXNsl~qlil~92T~58FRL36-4FpfXo0AoSJiGgG3kvnB7cJoI2Owjw5oRE7UoXHLFXr8MUpBYqAcsCt3d1tsoHfA1r2bNSuITynWJUWYBDMTocBQAEAAcAAA=='
    )
  ).toEqual('z3v47ifwlen474b5aprlf52k6ixa5fpnu5aamuxnulr2qhagrvmq');
});

Deno.test('createLocalDestination', async () => {
  const obj = await createLocalDestination({ sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } });

  //@FIXME
  expect(obj.address).not.toEqual('');
  expect(obj.public).not.toEqual('');
  expect(obj.private).not.toEqual('');
});

Deno.test('lookup', async () => {
  const s: string = await lookup({ sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } }, 'diva.i2p');
  expect(s).not.toEqual('');

  try {
    await lookup({ sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } }, 'diva.bogus');
    // test always fails
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).message).toContain('Invalid I2P address');
  }
});

Deno.test('keys', async () => {
  const sam: I2pSamRaw = await createRaw({
    sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
  });

  const pair: { public: string; private: string } = sam.getKeyPair();
  expect(pair.public).toEqual(sam.getPublicKey());
  expect(pair.private).toEqual(sam.getPrivateKey());
  expect(sam.getB32Address()).not.toEqual('');
  sam.close();
});

Deno.test('invalidConfig', async () => {
  try {
    await createRaw({
      sam: {
        timeout: 0,
      },
    } as Configuration);
    // always fails
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).message).toContain('ECONNREFUSED');
  }
});

Deno.test('failVersion', async () => {
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
    // always fails
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).message).toContain('HELLO failed');
    expect((error as Error).message).toContain('RESULT=NOVERSION');
  }
});

Deno.test('failKeys', async () => {
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
    // always fails
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).message).toContain('SESSION failed');
    expect((error as Error).message).toContain('RESULT=INVALID_KEY');
  }
});

Deno.test('failConnect', async () => {
  // connection error
  try {
    await createRaw({
      sam: {
        host: '127.0.0.256',
        portTCP: SAM_PORT_TCP,
      },
    });
    // always fails
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).message).toContain('ENOTFOUND');
  }
});
