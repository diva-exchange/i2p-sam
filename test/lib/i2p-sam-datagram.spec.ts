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
import { createDatagram, I2pSamDatagram } from '../../lib/index.js';
import crypto from 'crypto';

const SAM_HOST = process.env.SAM_HOST || '172.19.74.11';
const SAM_PORT_TCP = Number(process.env.SAM_PORT_TCP) || 7656;
const SAM_PORT_UDP = Number(process.env.SAM_PORT_UDP) || 7655;
const SAM_LISTEN_ADDRESS = process.env.SAM_LISTEN_ADDRESS || '0.0.0.0';
const SAM_LISTEN_PORT = Number(process.env.SAM_LISTEN_PORT) || 20222;
const SAM_LISTEN_FORWARD = process.env.SAM_LISTEN_FORWARD || '172.19.74.1';

@suite
class TestI2pSamDatagram {
  @test
  @timeout(180000)
  async send(): Promise<void> {
    let messageCounterA: number = 0;
    let messageCounterB: number = 0;

    let destinationSender: string = '';
    let destinationRecipient: string = '';

    // 1K text data
    const dataToSend: Buffer = Buffer.from(
      '\n' + crypto.randomFillSync(Buffer.alloc(1000)).toString('base64').substring(0, 1023)
    );

    let i2pSender: I2pSamDatagram = {} as I2pSamDatagram;
    let i2pRecipient: I2pSamDatagram = {} as I2pSamDatagram;
    try {
      console.log('Creating Sender...');
      i2pSender = await createDatagram({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT,
          hostForward: SAM_LISTEN_FORWARD,
        },
      });
      i2pSender.on('data', (data: Buffer) => {
        expect(data.toString()).to.be.equal(dataToSend.toString());
        messageCounterA++;
      });

      destinationSender = i2pSender.getPublicKey();

      console.log('Creating Recipient...');
      i2pRecipient = await createDatagram({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
        listen: {
          address: SAM_LISTEN_ADDRESS,
          port: SAM_LISTEN_PORT + 1,
          hostForward: SAM_LISTEN_FORWARD,
        },
      });
      i2pRecipient.on('data', (data: Buffer) => {
        expect(data.toString()).to.be.equal(dataToSend.toString());
        messageCounterB++;
      });
      destinationRecipient = i2pRecipient.getPublicKey();

      console.log(Date.now() + ' - start sending messages...');
      let sentMsg: number = 0;
      const intervalSender: NodeJS.Timer = setInterval(async (): Promise<void> => {
        i2pSender.send(destinationRecipient, dataToSend);
        sentMsg++;
      }, 50);

      const intervalRecipient: NodeJS.Timer = setInterval(async (): Promise<void> => {
        i2pRecipient.send(destinationSender, dataToSend);
        sentMsg++;
      }, 50);

      while (!(messageCounterA >= 10 && messageCounterB >= 10)) {
        await TestI2pSamDatagram.wait(100);
      }
      console.log(Date.now() + ' - total sent messages: ' + sentMsg);
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
  async failTimeout(): Promise<void> {
    let datagram: I2pSamDatagram = {} as I2pSamDatagram;
    // timeout error
    try {
      datagram = await createDatagram({
        sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP, timeout: 1 },
      });
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('timeout');
    } finally {
      Object.keys(datagram).length && datagram.close();
    }
  }

  @test
  async failKeys(): Promise<void> {
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
      expect(false).to.be.true;
    } catch (error: any) {
      expect(error.toString()).contains('SESSION failed').contains('RESULT=INVALID_KEY');
    } finally {
      Object.keys(datagram).length && datagram.close();
    }
  }

  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
