import { describe, expect, it } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like, regex, eachLike } = MatchersV3;

describe('Pact Consumer - GET /api/groups/:id/balances', () => {
  const provider = new PactV3({
    consumer: 'splitto-frontend',
    provider: 'splitto-api',
    dir: 'pacts',
  });

  it('retourne 200 avec balances quand le groupe existe et a des dépenses', async () => {
    provider
      .given('group-1 a 3 membres et 2 dépenses')
      .uponReceiving('a request for existing group balances')
      .withRequest({
        method: 'GET',
        path: '/api/groups/group-1/balances',
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: like({
          groupId: regex('group-[a-zA-Z0-9_-]+', 'group-1'),
          balances: like({
            alice: like(10.5),
            bob: like(-5.25),
            charlie: like(-5.25),
          }),
          settlements: eachLike({
            from: regex('[a-zA-Z0-9_-]+', 'bob'),
            to: regex('[a-zA-Z0-9_-]+', 'alice'),
            amount: like(5.25),
          }),
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/groups/group-1/balances`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('balances');
    });
  });

  it("retourne 404 quand le groupe n'existe pas", async () => {
    provider
      .given('aucun groupe inexistant')
      .uponReceiving('a request for non-existing group balances')
      .withRequest({
        method: 'GET',
        path: '/api/groups/inexistant/balances',
      })
      .willRespondWith({
        status: 404,
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/groups/inexistant/balances`);
      expect(response.status).toBe(404);
    });
  });
});
