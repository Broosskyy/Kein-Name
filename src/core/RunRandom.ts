import type { Mutation } from '../types';

export class RunRandom {
  private state: number;

  constructor(readonly seed: number) {
    this.state = (seed >>> 0) || 0x6d2b79f5;
  }

  next(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  }

  chooseTwo(values: readonly Mutation[]): [Mutation, Mutation] {
    if (values.length < 2) throw new Error('At least two mutation choices are required.');
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.next() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return [copy[0], copy[1]];
  }
}

let seedSequence = 0;

export function createRunSeed(): number {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) return cryptoApi.getRandomValues(new Uint32Array(1))[0] || 1;
  seedSequence += 1;
  return ((Date.now() ^ (seedSequence * 0x9e3779b9)) >>> 0) || seedSequence;
}
