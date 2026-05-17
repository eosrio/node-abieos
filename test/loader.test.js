import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveNative } from '../dist/abieos.js';

test.describe('Native loader (resolveNative)', () => {

    test('returns the platform-specific binary when present', () => {
        const sentinel = { native: true };
        const req = (id) => {
            if (id === './abieos-linux-x64.node') return sentinel;
            throw new Error(`unexpected require(${id})`);
        };
        assert.strictEqual(resolveNative(req, 'linux', 'x64'), sentinel);
    });

    test('falls back to the generic ./abieos.node in order', () => {
        const sentinel = { fallback: true };
        const tried = [];
        const req = (id) => {
            tried.push(id);
            if (id === './abieos.node') return sentinel;
            throw new Error('not this one');
        };
        assert.strictEqual(resolveNative(req, 'win32', 'x64'), sentinel);
        assert.deepEqual(tried, ['./abieos-win32-x64.node', './abieos.node']);
    });

    test('reaches the ../lib fallback candidates (source layout)', () => {
        const sentinel = { lib: true };
        const req = (id) => {
            if (id === '../lib/abieos.node') return sentinel;
            throw new Error('missing');
        };
        assert.strictEqual(resolveNative(req, 'darwin', 'arm64'), sentinel);
    });

    test('throws an actionable error mapping the build script per platform', () => {
        const cases = [
            ['win32', 'x64', 'build:win'],
            ['darwin', 'arm64', 'build:mac'],
            ['linux', 'x64', 'build:linux'],
        ];
        for (const [platform, arch, expectedScript] of cases) {
            assert.throws(
                () => resolveNative(
                    (id) => { throw new Error(`cannot find ${id}`); },
                    platform,
                    arch,
                ),
                (err) =>
                    err instanceof Error &&
                    err.message.includes(expectedScript) &&
                    err.message.includes(`${platform}-${arch}`) &&
                    err.message.includes('Last error: cannot find'),
            );
        }
    });

    test('tolerates a non-Error thrown value in the message', () => {
        assert.throws(
            () => resolveNative(() => { throw 'string failure'; }, 'linux', 'x64'),
            /Last error: string failure/,
        );
    });

});
