/**
 * Copyright (C) 2021 diva.exchange
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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
    c.listen.onError ? expect(c.listen.onError()).to.be.undefined : expect(false).to.be.true;
    c.listen.onClose ? expect(c.listen.onClose()).to.be.undefined : expect(false).to.be.true;
    c.sam.onError ? expect(c.sam.onError()).to.be.undefined : expect(false).to.be.true;
    c.sam.onClose ? expect(c.sam.onClose()).to.be.undefined : expect(false).to.be.true;
  }

  @test
  session() {
    const c = new Config({ session: { id: 'test' } } as Configuration);
    expect(c.session.id).eq('test');
  }

  @test
  sessionInvalidPort() {
    const c1 = new Config({ listen: { port: 0 } } as Configuration);
    expect(c1.listen.port).eq(0);

    const c2 = new Config({ listen: { port: 1 } } as Configuration);
    expect(c2.listen.port).eq(1025);

    const c3 = new Config({ listen: { port: 65536 } } as Configuration);
    expect(c3.listen.port).eq(65535);
  }
}