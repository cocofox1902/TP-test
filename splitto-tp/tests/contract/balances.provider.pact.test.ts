import { readFile, readdir } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { Verifier } from '@pact-foundation/pact';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { createApp } from '../../src/server';

describe('Pact Provider - splitto-api', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let server: Server;
  let baseUrl = '';

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });

    const migrationPath = resolve(process.cwd(), 'migrations', '001-initial.sql');
    const migrationSql = await readFile(migrationPath, 'utf8');
    await pool.query(migrationSql);

    const app = createApp(pool);
    server = createServer(app);
    await new Promise<void>((resolveServer) => {
      server.listen(0, '127.0.0.1', () => resolveServer());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Cannot resolve provider server port');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 90_000);

  afterAll(async () => {
    await new Promise<void>((resolveServer, rejectServer) => {
      server.close((err) => (err ? rejectServer(err) : resolveServer()));
    });
    await pool.end();
    await container.stop();
  });

  it('vérifie le provider contre le pact consumer', async () => {
    const pactFiles = await readdir(resolve(process.cwd(), 'pacts'));
    const pactPaths = pactFiles
      .filter((file) => file.endsWith('.json'))
      .map((file) => resolve(process.cwd(), 'pacts', file));

    expect(pactPaths.length).toBeGreaterThan(0);

    const verifier = new Verifier({
      providerBaseUrl: baseUrl,
      provider: 'splitto-api',
      pactUrls: pactPaths,
      stateHandlers: {
        'group-1 a 3 membres et 2 dépenses': async () => {
          await pool.query('TRUNCATE groups CASCADE');

          await pool.query(
            'INSERT INTO groups (id, name, currency) VALUES ($1, $2, $3)',
            ['group-1', 'Group 1', 'EUR'],
          );

          await pool.query(
            `INSERT INTO members (id, group_id, name, email)
             VALUES
               ('alice', 'group-1', 'Alice', 'alice@test.dev'),
               ('bob', 'group-1', 'Bob', 'bob@test.dev'),
               ('charlie', 'group-1', 'Charlie', 'charlie@test.dev')`,
          );

          await pool.query(
            `INSERT INTO expenses
              (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, created_at)
             VALUES
              ($1, 'group-1', 'Diner', 30, 'EUR', 'alice', '2026-05-06T10:00:00.000Z', 'equal', $2::jsonb, '2026-05-06T10:01:00.000Z'),
              ($3, 'group-1', 'Taxi', 12, 'EUR', 'bob', '2026-05-06T12:00:00.000Z', 'equal', $4::jsonb, '2026-05-06T12:01:00.000Z')`,
            [
              'exp-1',
              JSON.stringify({ beneficiaries: ['alice', 'bob', 'charlie'] }),
              'exp-2',
              JSON.stringify({ beneficiaries: ['bob', 'charlie'] }),
            ],
          );
        },
        'aucun groupe inexistant': async () => {
          await pool.query('TRUNCATE groups CASCADE');
        },
      },
    });

    await verifier.verifyProvider();
  });
});
