import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            // Re-exports and interfaces have no executable statements.
            exclude: ['src/index.ts', 'src/providers/image_provider.ts'],
            reporter: ['text', 'json', 'json-summary', 'lcov'],
            thresholds: { lines: 100, functions: 100, statements: 100, branches: 100 },
        },
        reporters: ['default', 'junit'],
        outputFile: { junit: 'test-results/junit.xml' },
    },
});
