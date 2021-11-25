/**
 * MIT License - Copyright (c) 2021 diva.exchange
 *
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

import { suite, test, timeout } from '@testdeck/mocha';
import { expect } from 'chai';
import { createRaw, I2pSamRaw, lookup } from '../src/i2p-sam';
import crypto from 'crypto';
import { Configuration } from '../src/config';

const SAM_HOST = process.env.SAM_HOST || '172.19.74.11';
const SAM_PORT_TCP = Number(process.env.SAM_PORT_TCP) || 7656;
const SAM_PORT_UDP = Number(process.env.SAM_PORT_UDP) || 7655;
const SAM_LISTEN_ADDRESS = process.env.SAM_LISTEN_ADDRESS || '0.0.0.0';
const SAM_LISTEN_PORT = Number(process.env.SAM_LISTEN_PORT) || 20222;
const SAM_LISTEN_FORWARD = process.env.SAM_LISTEN_FORWARD || '172.19.74.1';

@suite
class TestI2pSamRaw {
  @test
  @timeout(120000)
  async send() {
    let messageCounterA = 0;
    let messageCounterB = 0;
    const arrayPerformanceA: Array<number> = [];
    const arrayPerformanceB: Array<number> = [];

    let destinationSender = '';
    let destinationRecipient = '';

    console.log('Creating Sender...');
    let i2pSender: I2pSamRaw = {} as I2pSamRaw;
    createRaw({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
      listen: {
        address: SAM_LISTEN_ADDRESS,
        port: SAM_LISTEN_PORT,
        hostForward: SAM_LISTEN_FORWARD,
        onMessage: (msg: Buffer) => {
          messageCounterA++;
          arrayPerformanceA.push(Date.now() - Number(msg.toString()));
        },
      },
    }).then((s) => {
      i2pSender = s;
      destinationSender = i2pSender.getPublicKey();
    });

    console.log('Creating Recipient...');
    let i2pRecipient: I2pSamRaw = {} as I2pSamRaw;
    createRaw({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
      listen: {
        address: SAM_LISTEN_ADDRESS,
        port: SAM_LISTEN_PORT + 1,
        hostForward: SAM_LISTEN_FORWARD,
        onMessage: (msg: Buffer) => {
          messageCounterB++;
          arrayPerformanceB.push(Date.now() - Number(msg.toString()));
        },
      },
    }).then((r) => {
      i2pRecipient = r;
      destinationRecipient = i2pRecipient.getPublicKey();
    });

    console.log('Start sending data...');
    const intervalSender = setInterval(async () => {
      destinationSender &&
        destinationRecipient &&
        i2pSender.send(destinationRecipient, Buffer.from(Date.now().toString()));
    }, 1000);

    const intervalRecipient = setInterval(async () => {
      destinationSender &&
        destinationRecipient &&
        i2pRecipient.send(destinationSender, Buffer.from(Date.now().toString()));
    }, 1000);

    while (messageCounterA < 10 || messageCounterB < 10) {
      await TestI2pSamRaw.wait(1000);
    }

    clearInterval(intervalSender);
    destinationSender && i2pSender.close();
    clearInterval(intervalRecipient);
    destinationRecipient && i2pRecipient.close();

    console.log('messageCounterA ' + messageCounterA);
    console.log(arrayPerformanceA);
    console.log('messageCounterB ' + messageCounterB);
    console.log(arrayPerformanceB);

    expect(messageCounterA).not.to.be.equal(0);
    expect(messageCounterB).not.to.be.equal(0);
  }

  @test
  @timeout(90000)
  async fail() {
    const config: Configuration = { sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP } };
    const dest = await lookup(config, 'diva.i2p');
    const sam = await createRaw(config);

    let e = '';
    await new Promise((resolve) => {
      sam.removeAllListeners();
      sam.once('error', (error: any) => {
        e = error.toString();
        resolve(true);
      });
      sam.send('diva.i2p', Buffer.from(''));
    });
    expect(e).contains('MIN_UDP_MESSAGE_LENGTH');

    e = '';
    await new Promise((resolve) => {
      sam.removeAllListeners();
      sam.on('error', (error: any) => {
        e = error.toString();
        resolve(true);
      });
      sam.send(dest, crypto.randomFillSync(Buffer.alloc(32 * 1024)));
    });
    expect(e).contains('MAX_UDP_MESSAGE_LENGTH');
  }

  @test
  async failListen() {
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

  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
