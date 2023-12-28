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
import crypto from 'crypto';
import { Configuration } from '../../lib/index.js';
import { createRaw, I2pSamRaw, lookup } from '../../lib/index.js';

const SAM_HOST: string = process.env.SAM_HOST || '172.19.74.11';
const SAM_PORT_TCP: number = Number(process.env.SAM_PORT_TCP) || 7656;
const SAM_PORT_UDP: number = Number(process.env.SAM_PORT_UDP) || 7655;
const SAM_LISTEN_ADDRESS: string = process.env.SAM_LISTEN_ADDRESS || '0.0.0.0';
const SAM_LISTEN_PORT: number = Number(process.env.SAM_LISTEN_PORT) || 20224;
const SAM_LISTEN_FORWARD: string = process.env.SAM_LISTEN_FORWARD || '172.19.74.1';

@suite
class TestI2pSamRaw {
  @test
  @timeout(300000)
  async send(): Promise<void> {
    let messageCounterA: number = 0;
    let messageCounterB: number = 0;

    let destinationSender: string = '';
    let destinationRecipient: string = '';

    // 16K data
    const dataToSend: Buffer = crypto.randomFillSync(Buffer.alloc(16 * 1024));

    let i2pSender: I2pSamRaw = {} as I2pSamRaw;
    let i2pRecipient: I2pSamRaw = {} as I2pSamRaw;

    try {
      console.log('Creating Sender...');
      i2pSender = await createRaw({
        session: { options: 'inbound.lengthVariance=2 outbound.lengthVariance=2 shouldBundleReplyInfo=false' },
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT,
          hostForward: SAM_LISTEN_FORWARD,
        },
      });
      i2pSender.on('data', (data: Buffer) => {
        expect(data.toString('base64')).to.be.equal(dataToSend.toString('base64'));
        messageCounterA++;
      });

      destinationSender = i2pSender.getPublicKey();

      console.log('Creating Recipient...');
      i2pRecipient = await createRaw({
        session: { options: 'inbound.lengthVariance=2 outbound.lengthVariance=2 shouldBundleReplyInfo=false' },
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT + 1,
          hostForward: SAM_LISTEN_FORWARD,
        },
      });
      i2pRecipient.on('data', (data: Buffer): void => {
        expect(data.toString('base64')).to.be.equal(dataToSend.toString('base64'));
        messageCounterB++;
      });

      destinationRecipient = i2pRecipient.getPublicKey();

      console.log(Date.now() + ' - send udp to diva.i2p (provoking a lookup)');
      i2pSender.send('diva.i2p', dataToSend);

      console.log(Date.now() + ' - start sending data...');
      let sentMsg: number = 0;
      const intervalSender: NodeJS.Timeout = setInterval(async (): Promise<void> => {
        i2pSender.send(destinationRecipient, dataToSend);
        sentMsg++;
      }, 50);

      const intervalRecipient: NodeJS.Timeout = setInterval(async (): Promise<void> => {
        i2pRecipient.send(destinationSender, dataToSend);
        sentMsg++;
      }, 50);

      while (!(messageCounterA >= 10 && messageCounterB >= 10)) {
        await TestI2pSamRaw.wait(100);
      }
      console.log(Date.now() + ' - total Sent: ' + sentMsg);
      console.log('Arrived: ' + Math.round(((messageCounterA + messageCounterB) / sentMsg) * 1000) / 10 + '%');

      clearInterval(intervalSender);
      clearInterval(intervalRecipient);
    } catch (error: any) {
      console.debug(error.toString());
    } finally {
      Object.keys(i2pSender).length && i2pSender.close();
      Object.keys(i2pRecipient).length && i2pRecipient.close();
    }

    expect(messageCounterA).not.to.be.equal(0);
    expect(messageCounterB).not.to.be.equal(0);
  }

  @test
  @timeout(300000)
  async failEmptyMessage(): Promise<void> {
    const config: Configuration = { sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } };
    const dest: string = await lookup(config, 'diva.i2p');
    let raw: I2pSamRaw = {} as I2pSamRaw;
    try {
      raw = await createRaw(config);
      raw.send(dest, Buffer.from(''));
    } catch (error: any) {
      expect(error.toString()).contains('invalid message length');
    } finally {
      Object.keys(raw).length && raw.close();
    }
  }

  @test
  @timeout(300000)
  async failTooLargeMessage(): Promise<void> {
    const config: Configuration = { sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } };
    const dest: string = await lookup(config, 'diva.i2p');
    let raw: I2pSamRaw = {} as I2pSamRaw;
    try {
      raw = await createRaw(config);
      raw.send(dest, Buffer.from(crypto.randomFillSync(Buffer.alloc(65 * 1024))));
    } catch (error: any) {
      expect(error.toString()).contains('invalid message length');
    } finally {
      Object.keys(raw).length && raw.close();
    }
  }

  @test
  async failTimeout(): Promise<void> {
    let raw: I2pSamRaw = {} as I2pSamRaw;
    // timeout error
    try {
      raw = await createRaw({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, timeout: 1 },
      });
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('timeout');
    } finally {
      Object.keys(raw).length && raw.close();
    }
  }

  @test
  async failListen(): Promise<void> {
    let raw: I2pSamRaw = {} as I2pSamRaw;
    try {
      raw = await createRaw({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
        listen: {
          address: SAM_HOST,
          port: SAM_PORT_TCP,
        },
      });
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('EADDRNOTAVAIL');
    } finally {
      Object.keys(raw).length && raw.close();
    }
  }

  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
