/**
 * MIT License - Copyright (c) 2021 diva.exchange
 *
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

import { suite, test, slow, timeout } from '@testdeck/mocha';
import { expect } from 'chai';
import { createDatagram, I2pSamDatagram } from '../src/i2p-sam';

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
    const arrayPerformanceA: Array<number> = [];
    const arrayPerformanceB: Array<number> = [];

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
    ).on('data', (msg: Buffer) => {
      messageCounterA++;
      arrayPerformanceA.push(Date.now() - Number(msg.toString()));
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
    ).on('data', (msg: Buffer) => {
      messageCounterB++;
      arrayPerformanceB.push(Date.now() - Number(msg.toString()));
    });
    destinationRecipient = i2pRecipient.getPublicKey();

    console.log('Start sending data...');
    console.log(Date.now());
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
    console.log(Date.now());
    console.log('Total Sent: ' + sentMsgs);
    console.log('Arrived: ' + Math.round(((messageCounterA + messageCounterB) / sentMsgs) * 1000) / 10 + '%');

    clearInterval(intervalSender);
    clearInterval(intervalRecipient);
    i2pSender.close();
    i2pRecipient.close();

    console.log('messageCounterA ' + messageCounterA);
    console.log(arrayPerformanceA);
    console.log('messageCounterB ' + messageCounterB);
    console.log(arrayPerformanceB);

    expect(messageCounterA).not.to.be.equal(0);
    expect(messageCounterB).not.to.be.equal(0);
  }

  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
