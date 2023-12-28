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

import { Configuration, createRaw, I2pSamRaw } from '../../lib/index.js';
import fs from 'fs';
import path from 'path';

const SAM_HOST: string = process.env.SAM_HOST || '172.19.74.11';
const SAM_PORT_TCP: number = Number(process.env.SAM_PORT_TCP) || 7656;
const SAM_PORT_UDP: number = Number(process.env.SAM_PORT_UDP) || 7655;
const SAM_LISTEN_ADDRESS: string = process.env.SAM_LISTEN_ADDRESS || '0.0.0.0';
const SAM_LISTEN_PORT: number = Number(process.env.SAM_LISTEN_PORT) || 20222;
const SAM_LISTEN_FORWARD: string = process.env.SAM_LISTEN_FORWARD || '172.19.74.1';

class TestI2pSamRawBenchmark {
  private readonly minutes: number;
  private readonly interval: number; // ms
  private readonly listenPort: number;
  private readonly optionsSession: string;
  private readonly pathCSV: string;

  constructor(
    minutes: number = 3,
    interval: number = 100,
    listenPort: number = SAM_LISTEN_PORT,
    optionsSession: string = ''
  ) {
    this.minutes = minutes;
    this.interval = interval;
    this.listenPort = listenPort;
    this.optionsSession = optionsSession;
    const now: Date = new Date();
    this.pathCSV = fs.realpathSync(path.dirname(import.meta.url.replace(/^file:\/\//, '')) + '/../data/') + '/';
    this.pathCSV += `${now.toISOString().replace(/[.\-:]/g, '')}-${listenPort}-Hidden-RawBenchmark.csv`;
  }

  async run() {
    let messageReceived = 0;
    const arrayPerformance: Array<number> = [];
    let arrayCSV: Array<Array<number>> = [];

    let destinationSender = '';
    let destinationRecipient = '';

    console.log(`${this.listenPort} / Creating Sender...`);
    const config: Configuration = {
      sam: { host: SAM_HOST, portTCP: SAM_PORT_TCP, portUDP: SAM_PORT_UDP },
      listen: {
        address: SAM_LISTEN_ADDRESS,
        port: this.listenPort,
        hostForward: SAM_LISTEN_FORWARD,
      },
    };
    if (this.optionsSession) {
      config.session = { options: this.optionsSession };
    }
    const i2pSender: I2pSamRaw = (await createRaw(config)).on('data', (msg: Buffer) => {
      messageReceived++;
      const n: number = Date.now();
      const l: number = n - Number(msg.toString());
      arrayPerformance.push(l);
      arrayCSV.push([n, l]);
    });
    destinationSender = i2pSender.getPublicKey();

    console.log(`${this.listenPort} / Creating Recipient...`);
    config.listen?.port && (config.listen.port = this.listenPort + 1);
    const i2pRecipient: I2pSamRaw = (await createRaw(config)).on('data', (msg: Buffer) => {
      messageReceived++;
      const n: number = Date.now();
      const l: number = n - Number(msg.toString());
      arrayPerformance.push(l);
      arrayCSV.push([n, l]);
    });
    destinationRecipient = i2pRecipient.getPublicKey();

    console.log(`${this.listenPort} / Starting & running for ${this.minutes}mins / ${Date.now()}`);
    let sentMsgs: number = 0;
    const intervalSender = setInterval(async () => {
      i2pSender.send(destinationRecipient, Buffer.from(Date.now().toString()));
      sentMsgs++;
    }, this.interval);

    await TestI2pSamRawBenchmark.wait(Math.floor(this.interval / 2.1));

    const intervalRecipient = setInterval(async () => {
      i2pRecipient.send(destinationSender, Buffer.from(Date.now().toString()));
      sentMsgs++;
    }, this.interval);

    let n: number = 0;
    const fCSV = fs.openSync(this.pathCSV, 'a');
    fs.writeSync(fCSV, `Params: ${this.minutes}/${this.interval}/${this.optionsSession}\r\n`);
    while (n++ < this.minutes) {
      await TestI2pSamRawBenchmark.wait(60000);
      // write csv
      arrayCSV.forEach((a) => {
        fs.writeSync(fCSV, a.join(',') + '\r\n');
      });
      arrayCSV = [];
      console.log(`${this.listenPort} / ${n} / sent ${sentMsgs} messages`);
    }

    fs.closeSync(fCSV);
    clearInterval(intervalSender);
    clearInterval(intervalRecipient);
    i2pSender.close();
    i2pRecipient.close();

    console.log(`${this.listenPort} / sent ${sentMsgs} messages / ${Date.now()}`);
    console.log(`${this.listenPort} / arrived: ${((messageReceived / sentMsgs) * 100).toFixed(1)}%`);

    // latency distribution
    const a: Array<number> = arrayPerformance.sort((a: number, b: number) => a - b);
    console.log(`${this.listenPort} / Latency, min: ${a[0]}`);
    console.log(`${this.listenPort} / Latency, 1st quartile: ${a[Math.floor(a.length / 4)]}`);
    console.log(`${this.listenPort} / Latency, median: ${a[Math.floor(a.length / 2)]}`);
    console.log(`${this.listenPort} / Latency, 3rd quartile: ${a[Math.floor((a.length / 4) * 3)]}`);
    console.log(`${this.listenPort} / Latency, max: ${a[a.length - 1]}`);
  }

  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const jobsDone: Array<boolean> = [];
const jobs: Array<Function> = [
  async (): Promise<void> => {
    await new TestI2pSamRawBenchmark(
      360,
      500,
      20200,
      ''
      //'inbound.lengthVariance=2 outbound.lengthVariance=2 shouldBundleReplyInfo=false'
    ).run();
    jobsDone.push(true);
  },
  async (): Promise<void> => {
    await new TestI2pSamRawBenchmark(360, 500, 20300).run();
    jobsDone.push(true);
  },
];
jobs.forEach((f) => f());

while (jobsDone.length < jobs.length) {
  await TestI2pSamRawBenchmark.wait(1000);
}
