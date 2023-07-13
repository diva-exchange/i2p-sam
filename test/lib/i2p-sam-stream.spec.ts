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

import { slow, suite, test, timeout } from '@testdeck/mocha';
import { expect } from 'chai';
import net from 'net';
import { createForward, createStream, toB32, I2pSamStream } from '../../lib/index.js';

const SAM_HOST = process.env.SAM_HOST || '172.19.74.11';
const SAM_PORT_TCP = Number(process.env.SAM_PORT_TCP || 7656);

const SAM_FORWARD_HOST = process.env.SAM_FORWARD_HOST || '172.19.74.1';
const SAM_FORWARD_PORT = Number(process.env.SAM_PORT_TCP || 20222);

@suite
class TestI2pSamStream {
  @test
  @slow(60000)
  @timeout(90000)
  async stream() {
    let messageCounter = 0;

    console.log('Creating Stream...');
    const i2pSender: I2pSamStream = await createStream({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
      stream: {
        destination: 'diva.i2p',
      },
    });
    i2pSender.on('data', () => {
      messageCounter++;
    });

    console.log('Start streaming data...');
    console.log(Date.now());

    // send some data to diva.i2p
    i2pSender.stream(Buffer.from('GET /hosts.txt HTTP/1.1\r\nHost: diva.i2p\r\n\r\n'));
    while (!messageCounter) {
      await TestI2pSamStream.wait(500);
    }
    console.log(Date.now());

    i2pSender.close();

    expect(messageCounter).not.to.be.equal(0);
  }

  @test
  @slow(120000)
  @timeout(180000)
  async forward() {
    let messageCounter = 0;

    console.log('Creating listener');
    const serverForward = net.createServer((c) => {
      console.debug('client connected');
      c.on('end', () => {
        console.debug('client disconnected');
      });
      c.on('data', () => {
        c.write(`hello ${messageCounter}\n`);
      });
    });

    serverForward.listen(SAM_FORWARD_PORT);

    console.log('Creating Forward...');
    const i2pForward: I2pSamStream = await createForward({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
      forward: {
        host: SAM_FORWARD_HOST,
        port: SAM_FORWARD_PORT,
        silent: true,
      },
    });

    const destination = i2pForward.getPublicKey();

    console.log('Creating Stream...');
    let i2pSender: I2pSamStream = {} as I2pSamStream;
    while (!Object.keys(i2pSender).length) {
      try {
        i2pSender = await createStream({
          sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
          stream: {
            destination: destination,
          },
        });
        i2pSender.on('data', () => {
          messageCounter++;
        });
      } catch (error: any) {
        console.debug(error.toString());
      }
    }

    console.log('Start streaming data...');
    const start = Date.now();
    // send some data to destination
    const amount = 5;
    while (messageCounter < amount) {
      i2pSender.stream(Buffer.from(`GET / HTTP/1.1\r\nHost: ${toB32(destination)}.b32.i2p\r\n\r\n`));
      await TestI2pSamStream.wait(500);
    }
    console.log(`${(Date.now() - start) / amount} milliseconds per roundtrip`);

    i2pForward.close();
    i2pSender.close();
    serverForward.close();

    expect(messageCounter).not.to.be.equal(0);
  }

  @test
  async fail() {
    // connection error
    try {
      await createStream({
        sam: {
          host: '127.0.0.256',
          portTCP: SAM_PORT_TCP,
        },
        stream: { destination: 'diva.i2p' },
      });
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('ENOTFOUND');
    }

    // empty destination
    try {
      await createStream({
        sam: {
          host: SAM_HOST,
          portTCP: SAM_PORT_TCP,
        },
        stream: { destination: '' },
      });
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('Stream configuration invalid');
    }
  }

  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
