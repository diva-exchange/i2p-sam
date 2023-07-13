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

import { suite, test, slow, timeout } from '@testdeck/mocha';
import { expect } from 'chai';
import { createDatagram, I2pSamDatagram } from '../../lib/index.js';

const SAM_HOST = process.env.SAM_HOST || '172.19.74.11';
const SAM_PORT_TCP = Number(process.env.SAM_PORT_TCP) || 7656;
const SAM_PORT_UDP = Number(process.env.SAM_PORT_UDP) || 7655;
const SAM_LISTEN_ADDRESS = process.env.SAM_LISTEN_ADDRESS || '0.0.0.0';
const SAM_LISTEN_PORT = Number(process.env.SAM_LISTEN_PORT) || 20222;
const SAM_LISTEN_FORWARD = process.env.SAM_LISTEN_FORWARD || '172.19.74.1';

@suite
class TestI2pSamDatagram {
  @test
  @timeout(120000)
  @slow(120000)
  async send() {
    let messageCounterA = 0;
    let messageCounterB = 0;

    let destinationSender = '';
    let destinationRecipient = '';

    console.log('Creating Sender...');
    const i2pSender: I2pSamDatagram = (
      await createDatagram({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT,
          hostForward: SAM_LISTEN_FORWARD,
        },
      })
    ).on('data', () => {
      messageCounterA++;
    });
    destinationSender = i2pSender.getPublicKey();

    console.log('Creating Recipient...');
    const i2pRecipient: I2pSamDatagram = (
      await createDatagram({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT + 1,
          hostForward: SAM_LISTEN_FORWARD,
        },
      })
    ).on('data', () => {
      messageCounterB++;
    });
    destinationRecipient = i2pRecipient.getPublicKey();

    console.log(Date.now() + ' - start sending data...');
    let sentMsgs = 0;
    const intervalSender = setInterval(async () => {
      i2pSender.send(destinationRecipient, Buffer.from(Date.now().toString()));
      sentMsgs++;
    }, 50);

    const intervalRecipient = setInterval(async () => {
      i2pRecipient.send(destinationSender, Buffer.from(Date.now().toString()));
      sentMsgs++;
    }, 50);

    while (!(messageCounterA >= 10 && messageCounterB >= 10)) {
      await TestI2pSamDatagram.wait(100);
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

  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
