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

import { Configuration } from './config';
import { I2pSamStream } from './i2p-sam-stream';
import { I2pSamRaw } from './i2p-sam-raw';

export const I2PSAMStream = async (c: Configuration) => {
  return I2pSamStream.make(c);
};

export const I2PSAMRaw = async (c: Configuration) => {
  return I2pSamRaw.make(c);
};
