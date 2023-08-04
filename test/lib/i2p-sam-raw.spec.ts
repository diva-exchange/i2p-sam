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
const SAM_LISTEN_PORT: number = Number(process.env.SAM_LISTEN_PORT) || 20222;
const SAM_LISTEN_FORWARD: string = process.env.SAM_LISTEN_FORWARD || '172.19.74.1';

@suite
class TestI2pSamRaw {
  @test
  @timeout(180000)
  async send(): Promise<void> {
    let messageCounterA: number = 0;
    let messageCounterB: number = 0;

    let destinationSender: string = '';
    let destinationRecipient: string = '';

    // 16K data
    const dataToSend: Buffer = crypto.randomFillSync(Buffer.alloc(16 * 1024));

    console.log('Creating Sender...');
    const i2pSender: I2pSamRaw = (
      await createRaw({
        session: { options: 'inbound.lengthVariance=2 outbound.lengthVariance=2 shouldBundleReplyInfo=false' },
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT,
          hostForward: SAM_LISTEN_FORWARD,
        },
      })
    ).on('data', (data: Buffer) => {
      expect(data.toString('base64')).to.be.equal(dataToSend.toString('base64'));
      messageCounterA++;
    });
    destinationSender = i2pSender.getPublicKey();

    console.log('Creating Recipient...');
    const i2pRecipient: I2pSamRaw = (
      await createRaw({
        session: { options: 'inbound.lengthVariance=2 outbound.lengthVariance=2 shouldBundleReplyInfo=false' },
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT + 1,
          hostForward: SAM_LISTEN_FORWARD,
        },
      })
    ).on('data', (data: Buffer): void => {
      expect(data.toString('base64')).to.be.equal(dataToSend.toString('base64'));
      messageCounterB++;
    });
    destinationRecipient = i2pRecipient.getPublicKey();

    console.log(Date.now() + ' - start sending data...');
    let sentMsgs: number = 0;
    const intervalSender: NodeJS.Timer = setInterval(async (): Promise<void> => {
      i2pSender.send(destinationRecipient, dataToSend);
      sentMsgs++;
    }, 50);

    const intervalRecipient: NodeJS.Timer = setInterval(async (): Promise<void> => {
      i2pRecipient.send(destinationSender, dataToSend);
      sentMsgs++;
    }, 50);

    while (!(messageCounterA >= 10 && messageCounterB >= 10)) {
      await TestI2pSamRaw.wait(100);
    }
    console.log(Date.now() + ' - total Sent: ' + sentMsgs);
    console.log('Arrived: ' + Math.round(((messageCounterA + messageCounterB) / sentMsgs) * 1000) / 10 + '%');

    clearInterval(intervalSender);
    clearInterval(intervalRecipient);
    i2pSender.close();
    i2pRecipient.close();

    expect(messageCounterA).not.to.be.equal(0);
    expect(messageCounterB).not.to.be.equal(0);
  }

  @test
  @timeout(90000)
  async fail(): Promise<void> {
    const config: Configuration = { sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } };
    const dest: string = await lookup(config, 'diva.i2p');
    const sam: I2pSamRaw = await createRaw(config);

    let e: string = '';
    await new Promise((resolve) => {
      sam.removeAllListeners();
      sam.once('error', (error: any) => {
        e = error.toString();
        resolve(true);
      });
      sam.send(dest, Buffer.from(''));
    });
    expect(e).contains('invalid message length');

    await new Promise((resolve) => {
      sam.removeAllListeners();
      sam.once('error', (error: any) => {
        e = error.toString();
        resolve(true);
      });
      sam.send(dest, Buffer.from(crypto.randomFillSync(Buffer.alloc(65 * 1024))));
    });
    expect(e).contains('invalid message length');
  }

  @test
  async failListen(): Promise<void> {
    try {
      await createRaw({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
        listen: {
          address: SAM_HOST,
          port: SAM_PORT_TCP,
        },
      });
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('EADDRNOTAVAIL');
    }
  }

  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
