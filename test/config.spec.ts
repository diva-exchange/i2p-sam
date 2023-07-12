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

import { suite, test } from '@testdeck/mocha';
import { expect } from 'chai';
import { Config, Configuration } from '../lib/index.js';

@suite
class TestConfig {
  @test
  default() {
    const c = new Config({} as Configuration);
    expect(c.session.id).is.not.empty;
  }

  @test
  session() {
    const c1 = new Config({ session: { id: 'test' } } as Configuration);
    expect(c1.session.id).eq('test');

    const c2 = new Config({ listen: { portForward: 10000 } } as Configuration);
    expect(c2.listen.portForward).eq(10000);
  }

  @test
  sessionInvalidPort() {
    const c1 = new Config({ listen: { port: -1 } } as Configuration);
    expect(c1.listen.port).eq(0);

    const c2 = new Config({ listen: { port: 1 } } as Configuration);
    expect(c2.listen.port).eq(1025);

    const c3 = new Config({ listen: { port: 65536 } } as Configuration);
    expect(c3.listen.port).eq(65535);

    const c4 = new Config({ sam: { portUDP: -1 } } as Configuration);
    expect(c4.sam.portUDP).eq(0);
  }
}
