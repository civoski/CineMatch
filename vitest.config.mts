import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        include: ['src/**/*.test.ts'],
        // Las pruebas de integración usan la red y credenciales reales: se corren a mano.
        exclude: ['**/node_modules/**', 'src/**/*.integration.test.ts'],
    },
});
