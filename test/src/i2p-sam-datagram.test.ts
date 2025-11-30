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

import { concat } from '@std/bytes';
import {
  createDatagram,
  type I2pSamDatagram,
} from '../../src/i2p-sam-datagram.ts';
import { randomFillSync } from 'node:crypto';
import { expect } from '@std/expect';

const SAM_HOST = Deno.env.get('SAM_HOST') || '172.19.74.11';
const SAM_PORT_TCP = Number(Deno.env.get('SAM_PORT_TCP')) || 7656;
const SAM_PORT_UDP = Number(Deno.env.get('SAM_PORT_UDP')) || 7655;
const SAM_LISTEN_ADDRESS = Deno.env.get('SAM_LISTEN_ADDRESS') || '0.0.0.0';
const SAM_LISTEN_PORT = Number(Deno.env.get('SAM_LISTEN_PORT')) || 20222;
const SAM_LISTEN_FORWARD = Deno.env.get('AM_LISTEN_FORWARD') || '172.19.74.1';

Deno.test('Datagram send', async (t: Deno.TestContext) => {
  let messageCounterA: number = 0;
  let messageCounterB: number = 0;

  let destinationSender: string = '';
  let destinationRecipient: string = '';

  // 1K text data
  const dataToSend: Uint8Array = concat(
    [new TextEncoder().encode('\n'), randomFillSync(new Uint8Array(1023))],
  );

  let i2pSender: I2pSamDatagram = {} as I2pSamDatagram;
  let i2pRecipient: I2pSamDatagram = {} as I2pSamDatagram;
  try {
    await t.step('Creating Sender', async () => {
      i2pSender = await createDatagram({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT,
          hostForward: SAM_LISTEN_FORWARD,
        },
      });
      i2pSender.on('data', (data: Uint8Array) => {
        messageCounterA++;
      });
      destinationSender = i2pSender.getPublicKey();
    });

    await t.step('Creating Recipient', async () => {
      i2pRecipient = await createDatagram({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT + 1,
          hostForward: SAM_LISTEN_FORWARD,
        },
      });
      i2pRecipient.on('data', (data: Uint8Array) => {
        messageCounterB++;
      });
      destinationRecipient = i2pRecipient.getPublicKey();
    });

    let sentMsg: number = 0;
    await t.step('Start sending messages', async () => {
      const intervalSender: number = setInterval(async (): Promise<void> => {
        i2pSender.send(destinationRecipient, dataToSend);
        sentMsg++;
      }, 50);

      const intervalRecipient: number = setInterval(async (): Promise<void> => {
        i2pRecipient.send(destinationSender, dataToSend);
        sentMsg++;
      }, 50);

      while (!(messageCounterA >= 10 && messageCounterB >= 10)) {
        // wait / sleep 1000ms
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      clearInterval(intervalSender);
      clearInterval(intervalRecipient);
    });

    const pA: number =
      Math.round(((messageCounterA + messageCounterB) / sentMsg) * 1000) / 10;
    await t.step(`Summary, sent ${sentMsg} messages; ${pA}% arrived`, () => {
      expect(sentMsg).toBeGreaterThan(0);
      expect(pA).toBeGreaterThan(0);
      expect(messageCounterA).not.toEqual(0);
      expect(messageCounterB).not.toEqual(0);
    });
  } catch (error: any) {
    // always fails
    expect(false, `Test Error ${(error as Error).toString()}`).toEqual(true);
  } finally {
    Object.keys(i2pSender).length && i2pSender.close();
    Object.keys(i2pRecipient).length && i2pRecipient.close();
  }
});

Deno.test('Datagram failTimeout', async () => {
  let datagram: I2pSamDatagram = {} as I2pSamDatagram;
  // timeout error
  try {
    datagram = await createDatagram({
      sam: {
        host: SAM_HOST,
        portTCP: SAM_PORT_TCP,
        portUDP: SAM_PORT_UDP,
        timeout: 1,
      },
    });
    expect(false).toBe(true);
  } catch (error: any) {
    expect(error.toString()).toContain('timeout');
  } finally {
    Object.keys(datagram).length && datagram.close();
  }
});

Deno.test('Datagram failKeys', async () => {
  let datagram: I2pSamDatagram = {} as I2pSamDatagram;
  // public key / private key issues
  try {
    datagram = await createDatagram({
      sam: {
        host: SAM_HOST,
        portTCP: SAM_PORT_TCP,
        publicKey: '-',
        privateKey: '--',
      },
    });
    // always false
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('SESSION failed');
    expect((error as Error).toString()).toContain('RESULT=INVALID_KEY');
  } finally {
    Object.keys(datagram).length && datagram.close();
  }
});
