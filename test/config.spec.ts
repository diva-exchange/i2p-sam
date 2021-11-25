/**
 * MIT License - Copyright (c) 2021 diva.exchange
 *
 * Author/Maintainer: Konrad Bächler <konrad@diva.exchange>
 */

import { suite, test } from '@testdeck/mocha';
import { expect } from 'chai';

import { Config, Configuration } from '../src/config';

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
