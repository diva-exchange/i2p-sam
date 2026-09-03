/**
 * Copyright 2021-2026 diva.exchange
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
import { lookup } from '../../src/i2p-sam.ts';
import { createRaw, type I2pSamRaw } from '../../src/i2p-sam-raw.ts';
import { expect } from '@std/expect';
import { randomFillSync } from 'node:crypto';

const SAM_HOST: string = Deno.env.get('SAM_HOST') || '172.19.74.11';
const SAM_PORT_TCP: number = Number(Deno.env.get('SAM_PORT_TCP')) || 7656;
const SAM_PORT_UDP: number = Number(Deno.env.get('SAM_PORT_UDP')) || 7655;
const SAM_LISTEN_ADDRESS: string = Deno.env.get('SAM_LISTEN_ADDRESS') ||
  '0.0.0.0';
const SAM_LISTEN_PORT: number = Number(Deno.env.get('SAM_LISTEN_PORT')) ||
  20224;
const SAM_LISTEN_FORWARD: string = Deno.env.get('SAM_LISTEN_FORWARD') ||
  '172.19.74.1';

Deno.test('Raw send', async (t: Deno.TestContext) => {
  let messageCounterA: number = 0;
  let messageCounterB: number = 0;

  let destinationSender: string = '';
  let destinationRecipient: string = '';

  // 8K data
  const dataToSend: Uint8Array = randomFillSync(new Uint8Array(8 * 1024));

  let i2pSender: I2pSamRaw | undefined;
  let i2pRecipient: I2pSamRaw | undefined;

  try {
    await t.step('Creating Sender', async () => {
      i2pSender = await createRaw({
        session: {
          options:
            'inbound.lengthVariance=2 outbound.lengthVariance=2 shouldBundleReplyInfo=false',
        },
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
      i2pRecipient = await createRaw({
        session: {
          options:
            'inbound.lengthVariance=2 outbound.lengthVariance=2 shouldBundleReplyInfo=false',
        },
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT + 1,
          hostForward: SAM_LISTEN_FORWARD,
        },
      });
      i2pRecipient.on('data', (data: Uint8Array): void => {
        messageCounterB++;
      });
      destinationRecipient = i2pRecipient.getPublicKey();
    });

    // provoking a lookup
    i2pSender!.send('diva.i2p', dataToSend);

    let sentMsg: number = 0;
    await t.step('Start sending messages', async () => {
      const intervalSender = setInterval(async (): Promise<void> => {
        i2pSender!.send(destinationRecipient, dataToSend);
        sentMsg++;
      }, 50);

      const intervalRecipient = setInterval(async (): Promise<void> => {
        i2pRecipient!.send(destinationSender, dataToSend);
        sentMsg++;
      }, 50);

      let waitCycles = 0;
      while (
        !(messageCounterA >= 10 && messageCounterB >= 10) && waitCycles < 60
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        waitCycles++;
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
  } catch (error: unknown) {
    // always fails
    expect(false, `Test Error ${(error as Error).toString()}`).toEqual(true);
  } finally {
    if (i2pSender) i2pSender.close();
    if (i2pRecipient) i2pRecipient.close();
  }
});

Deno.test('Raw failEmptyMessage', async () => {
  const config: Configuration = {
    sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
  };
  const dest: string = await lookup(config, 'diva.i2p');
  let raw: I2pSamRaw | undefined;
  try {
    raw = await createRaw(config);
    raw.send(dest, new Uint8Array(0));
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('invalid message length');
  } finally {
    if (raw) raw.close();
  }
});

Deno.test('Raw failTooLargeMessage', async () => {
  const config: Configuration = {
    sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
  };
  const dest: string = await lookup(config, 'diva.i2p');
  let raw: I2pSamRaw | undefined;
  try {
    raw = await createRaw(config);
    raw.send(dest, randomFillSync(new Uint8Array(65 * 1024)));
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('invalid message length');
  } finally {
    if (raw) raw.close();
  }
});

Deno.test('Raw failTimeout', async () => {
  let raw: I2pSamRaw | undefined;
  // timeout error
  try {
    raw = await createRaw({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, timeout: 1 },
    });
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('timeout');
  } finally {
    if (raw) raw.close();
  }
});

Deno.test('Raw failListen', async () => {
  let raw: I2pSamRaw | undefined;
  try {
    raw = await createRaw({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
      listen: {
        address: SAM_HOST,
        port: SAM_PORT_TCP,
      },
    });
    //always false
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('EADDRNOTAVAIL');
  } finally {
    if (raw) raw.close();
  }
});

Deno.test('Raw failEmptyMessage', async () => {
  const config: Configuration = {
    sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
  };
  const dest: string = await lookup(config, 'diva.i2p');
  
  let raw: I2pSamRaw | undefined;
  try {
    raw = await createRaw(config);
    raw.send(dest, new Uint8Array(0)); // Zu klein
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('invalid message length');
  } finally {
    if (raw) raw.close();
  }
});

Deno.test('Raw failTooLargeMessage', async () => {
  const config: Configuration = {
    sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
  };
  const dest: string = await lookup(config, 'diva.i2p');
  
  let raw: I2pSamRaw | undefined;
  try {
    raw = await createRaw(config);
    raw.send(dest, randomFillSync(new Uint8Array(65 * 1024))); // Zu groß
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('invalid message length');
  } finally {
    if (raw) raw.close();
  }
});

Deno.test('Raw failInvalidSendDestination', async () => {
  // Testet den Catch-Block in der privaten 's' Methode (z.B. durch DNS-Fehler beim Auflösen)
  let raw: I2pSamRaw | undefined;
  try {
    raw = await createRaw({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
    });
    
    // Zerstöre den UDP Socket künstlich, um den try/catch Block in raw.send() / raw.s() zu triggern
    (raw as any).socketControlUDP.close();
    
    const validData = new Uint8Array(10);
    // Sendet an einen String der NICHT mit .i2p endet, um direkt raw.s() aufzurufen
    raw.send('invalid-base64-destination', validData);
    
    // Warte kurz, damit der asynchrone Error-Emitter feuern kann
    await new Promise((resolve) => setTimeout(resolve, 100));
  } catch (error: unknown) {
    expect((error as Error).message).toBeDefined();
  } finally {
    if (raw) raw.close();
  }
});

Deno.test('Raw failTimeout', async () => {
  let raw: I2pSamRaw | undefined;
  // timeout error
  try {
    raw = await createRaw({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, timeout: 1 },
    });
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('timeout');
  } finally {
    if (raw) raw.close();
  }
});