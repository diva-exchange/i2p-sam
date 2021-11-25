/**
 * MIT License - Copyright (c) 2021 diva.exchange
 *
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

import { suite, test, timeout } from '@testdeck/mocha';
import { expect } from 'chai';
import { createStream, I2pSamStream } from '../src/i2p-sam';

const SAM_HOST = process.env.SAM_HOST || '172.19.74.11';
const SAM_PORT_TCP = Number(process.env.SAM_PORT_TCP || 7656);

@suite
class TestI2pSamStream {
  @test
  @timeout(120000)
  async send() {
    let messageCounter = 0;

    console.log('Creating Stream...');
    const i2pSender: I2pSamStream = await createStream({
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP },
      stream: {
        destination: 'diva.i2p',
        onMessage: () => {
          messageCounter++;
        },
      },
    });

    console.log('Start sending data...');

    // send some data to diva.i2p
    i2pSender.stream(Buffer.from('GET / HTTP/1.1\r\nHost: diva.i2p\r\n\r\n'));
    while (!messageCounter) {
      await TestI2pSamStream.wait(1000);
    }

    i2pSender.close();

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
      expect(error.toString()).contains('Stream destination empty');
    }
  }

  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
