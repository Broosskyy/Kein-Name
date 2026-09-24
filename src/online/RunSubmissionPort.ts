import type { RunContract } from '../types';

export interface RunSubmissionPort {
  submitRun(result: RunContract): Promise<void>;
}

// No implementation exists in M01.5. Competitive scores, ranked results,
// world-boss HP, rewards and economy must later be validated or calculated by
// a server. Client-submitted totals are never authoritative.
