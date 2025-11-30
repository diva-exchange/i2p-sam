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

import { createServer, type Server, type Socket } from 'node:net';
import { toB32 } from '../../src/i2p-sam.ts';
import { createForward, createStream, I2pSamStream } from '../../src/i2p-sam-stream.ts';
import { expect } from '@std/expect';

const SAM_HOST: string = Deno.env.get('SAM_HOST') || '172.19.74.11';
const SAM_PORT_TCP: number = Number(Deno.env.get('SAM_PORT_TCP') || 7656);

const SAM_FORWARD_HOST: string = Deno.env.get('SAM_FORWARD_HOST') || '172.19.74.1';
const SAM_FORWARD_PORT: number = Number(Deno.env.get('SAM_PORT_TCP') || 20226);

Deno.test('Stream stream', async (t: Deno.TestContext) => {
  let messageCounter: number = 0;
  let stream: I2pSamStream = {} as I2pSamStream;

  try {
    await t.step('Creating Stream', async () => {
      stream = await createStream({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
        stream: {
          destination: 'diva.i2p',
        },
      });
      stream.on('data', (): void => {
        messageCounter++;
      });
    });

    // send some data to diva.i2p
    await t.step('Streaming data', async () => {
      stream.stream(new TextEncoder().encode('GET /hosts.txt HTTP/1.1\r\nHost: diva.i2p\r\n\r\n'));
      while (!messageCounter) {
        // wait / sleep 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    });
  } catch (error: unknown) {
    // always fails
    expect(false, `Test Error ${(error as Error).toString()}`).toEqual(true);
  }

  Object.keys(stream).length && stream.close();
  expect(messageCounter).not.toEqual(0);
});

Deno.test('Stream forward', async (t: Deno.TestContext) => {
  let messageCounter: number = 0;

  await t.step('Creating listener', () => {
    const serverForward: Server = createServer((c: Socket): void => {
      c.on('end', (): void => {
        serverForward.close();
      });
      c.on('data', (): void => {
        c.write(`hello ${messageCounter}\n`);
      });
    });
    serverForward.listen(SAM_FORWARD_PORT);
  });

  let i2pForward: I2pSamStream = {} as I2pSamStream;
  let i2pSender: I2pSamStream = {} as I2pSamStream;
  await t.step('Creating Forward', async () => {
    try {
      i2pForward = await createForward({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
        forward: {
          host: SAM_FORWARD_HOST,
          port: SAM_FORWARD_PORT,
          silent: true,
        },
      });
    } catch (error: unknown) {
      // always fails
      expect(false, `Test Error ${(error as Error).toString()}`).toEqual(true);
    }
  });

  expect(Object.keys(i2pForward).length).toBeGreaterThan(0);

  const destination: string = i2pForward.getPublicKey();

  await t.step('Creating Stream to ' + destination, async () => {
    try {
      i2pSender = await createStream({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
        stream: {
          destination: destination,
        },
      });
      i2pSender.on('data', (): void => {
        messageCounter++;
      });
    } catch (error: unknown) {
      // always fails
      expect(false, `Test Error ${(error as Error).toString()}`).toEqual(true);
    }
  });

  await t.step('Streaming data', async () => {
    try {
      // send some data to destination
      while (messageCounter < 5) {
        i2pSender.stream(new TextEncoder().encode(`GET / HTTP/1.1\r\nHost: ${toB32(destination)}.b32.i2p\r\n\r\n`));
        // wait / sleep 1000ms
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: unknown) {
      // always fails
      expect(false, `Test Error ${(error as Error).toString()}`).toEqual(true);
    }
  });

  Object.keys(i2pForward).length && i2pForward.close();
  Object.keys(i2pSender).length && i2pSender.close();
  expect(messageCounter).not.toEqual(0);
});

Deno.test('Stream failTimeout', async () => {
  let stream: I2pSamStream = {} as I2pSamStream;
  // timeout error
  try {
    stream = await createStream({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, timeout: 2 },
      stream: {
        destination: 'diva.i2p',
      },
    });
    // always false
    expect(false).toEqual(true);
  } catch (error: any) {
    expect(error.toString()).toContain('timeout');
  } finally {
    Object.keys(stream).length && stream.close();
  }
});

Deno.test('Stream failNotFound', async () => {
  let stream: I2pSamStream = {} as I2pSamStream;
  // connection error
  try {
    stream = await createStream({
      sam: {
        host: '127.0.0.256',
        portTCP: SAM_PORT_TCP,
      },
      stream: { destination: 'diva.i2p' },
    });
    // always false
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('ENOTFOUND');
  } finally {
    Object.keys(stream).length && stream.close();
  }
});

Deno.test('Stream failEmptyDestination', async () => {
  let stream: I2pSamStream = {} as I2pSamStream;
  // empty destination
  try {
    stream = await createStream({
      sam: {
        host: SAM_HOST,
        portTCP: SAM_PORT_TCP,
      },
      stream: { destination: '' },
    });
    // always false
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('Stream configuration invalid');
  } finally {
    Object.keys(stream).length && stream.close();
  }
});

Deno.test('Stream failKeys', async () => {
  // public key / private key issues
  let stream: I2pSamStream = {} as I2pSamStream;
  try {
    stream = await createStream({
      sam: {
        host: SAM_HOST,
        portTCP: SAM_PORT_TCP,
        publicKey: '-',
        privateKey: '--',
      },
      stream: { destination: 'diva.i2p' },
    });
    // always false
    expect(false).toEqual(true);
  } catch (error: unknown) {
    expect((error as Error).toString()).toContain('SESSION failed');
    expect((error as Error).toString()).toContain('RESULT=INVALID_KEY');
  } finally {
    Object.keys(stream).length && stream.close();
  }
});
