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
import net from 'net';
import { createForward, createStream, toB32, I2pSamStream } from '../../lib/index.js';

const SAM_HOST: string = process.env.SAM_HOST || '172.19.74.11';
const SAM_PORT_TCP: number = Number(process.env.SAM_PORT_TCP || 7656);

const SAM_FORWARD_HOST: string = process.env.SAM_FORWARD_HOST || '172.19.74.1';
const SAM_FORWARD_PORT: number = Number(process.env.SAM_PORT_TCP || 20226);

@suite
class TestI2pSamStream {
  @test
  @timeout(120000)
  async stream(): Promise<void> {
    let messageCounter: number = 0;

    console.log('Creating Stream...');
    let stream: I2pSamStream = {} as I2pSamStream;
    try {
      stream = await createStream({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
        stream: {
          destination: 'diva.i2p',
        },
      });
      stream.on('data', (): void => {
        messageCounter++;
      });

      console.log('Start streaming data...');
      console.log(Date.now());

      // send some data to diva.i2p
      stream.stream(Buffer.from('GET /hosts.txt HTTP/1.1\r\nHost: diva.i2p\r\n\r\n'));
      while (!messageCounter) {
        await TestI2pSamStream.wait(500);
      }
      console.log(Date.now());
    } catch (error: any) {
      console.debug(error.toString());
    }

    Object.keys(stream).length && stream.close();
    expect(messageCounter).not.to.be.equal(0);
  }

  @test
  @timeout(180000)
  async forward(): Promise<void> {
    let messageCounter: number = 0;

    console.log('Creating listener');
    const serverForward: net.Server = net.createServer((c: net.Socket): void => {
      console.debug('client connected');
      c.on('end', (): void => {
        console.debug('client disconnected');
      });
      c.on('data', (): void => {
        c.write(`hello ${messageCounter}\n`);
      });
    });

    serverForward.listen(SAM_FORWARD_PORT);

    console.log('Creating Forward...');
    let i2pForward: I2pSamStream = {} as I2pSamStream;
    let i2pSender: I2pSamStream = {} as I2pSamStream;
    try {
      i2pForward = await createForward({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
        forward: {
          host: SAM_FORWARD_HOST,
          port: SAM_FORWARD_PORT,
          silent: true,
        },
      });
    } catch (error: any) {
      console.debug(error.toString());
    }

    if (Object.keys(i2pForward).length) {
      const destination: string = i2pForward.getPublicKey();
      console.log('Creating Stream to ' + destination);

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

        console.log('Start streaming data...');
        const start: number = Date.now();
        // send some data to destination
        const amount: number = 5;
        while (messageCounter < amount) {
          i2pSender.stream(Buffer.from(`GET / HTTP/1.1\r\nHost: ${toB32(destination)}.b32.i2p\r\n\r\n`));
          await TestI2pSamStream.wait(500);
        }
        console.log(`${(Date.now() - start) / amount} milliseconds per roundtrip`);
      } catch (error: any) {
        console.debug(error.toString());
      }
    }

    Object.keys(i2pForward).length && i2pForward.close();
    Object.keys(i2pSender).length && i2pSender.close();
    serverForward.close();
    expect(messageCounter).not.to.be.equal(0);
  }

  @test
  @timeout(5000)
  async failTimeout(): Promise<void> {
    let stream: I2pSamStream = {} as I2pSamStream;
    // timeout error
    try {
      stream = await createStream({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, timeout: 2 },
        stream: {
          destination: 'diva.i2p',
        },
      });
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('timeout');
    } finally {
      Object.keys(stream).length && stream.close();
    }
  }

  @test
  @timeout(5000)
  async failNotFound(): Promise<void> {
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
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('ENOTFOUND');
    } finally {
      Object.keys(stream).length && stream.close();
    }
  }

  @test
  @timeout(5000)
  async failEmptyDestination(): Promise<void> {
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
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('Stream configuration invalid');
    } finally {
      Object.keys(stream).length && stream.close();
    }
  }

  @test
  async failKeys(): Promise<void> {
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
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('SESSION failed').contains('RESULT=INVALID_KEY');
    } finally {
      Object.keys(stream).length && stream.close();
    }
  }

  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
