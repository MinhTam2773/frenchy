import { z } from 'zod';

// The CSP (public/_headers) has no 'unsafe-eval'. Zod probes `new Function('')` when a schema is
// built, which is caught but reported as a violation. Import this before any module that builds
// a schema (B-39, L-138).
z.config({ jitless: true });
