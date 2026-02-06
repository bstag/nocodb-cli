import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { bootstrap } from '../src/index.js';
import { NocoClient } from '@nocodb/sdk';

vi.mock('@nocodb/sdk', () => {
  const request = vi.fn();
  return {
    NocoClient: vi.fn().mockImplementation(() => ({
      request,
    })),
    MetaApi: vi.fn().mockImplementation(() => ({
      getBaseSwagger: vi.fn().mockResolvedValue({
        paths: {
          '/api/v2/tables/table1/records': {
            post: { operationId: 'create' },
            patch: { operationId: 'update' },
          },
        },
      }),
    })),
  };
});

describe('rows bulk-upsert command', () => {
  let client: any;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new NocoClient({ baseUrl: 'http://localhost', headers: {} });
    // @ts-ignore
    NocoClient.mockImplementation(() => client);
  });

  it('handles multi-page existing rows and creates/updates correctly', async () => {
    // Page 1: 2 rows
    client.request.mockResolvedValueOnce({
      list: [
        { Id: 1, Email: 'a@ex.com', Name: 'A' },
        { Id: 2, Email: 'b@ex.com', Name: 'B' },
      ],
      pageInfo: { totalRows: 2 }
    });
    
    // Create Response
    client.request.mockResolvedValueOnce({ created: true });
    // Update Response
    client.request.mockResolvedValueOnce({ updated: true });

    const incoming = [
      { Email: 'a@ex.com', Name: 'A-updated' }, // update
      { Email: 'c@ex.com', Name: 'C-new' },     // create
    ];

    const program = new Command();
    process.argv = [
      'node', 'index.js', 'rows', 'bulk-upsert', 'table1',
      '--match', 'Email',
      '--data', JSON.stringify(incoming)
    ];

    await bootstrap();

    // 1. GET Page 1 (returns totalRows: 2, matching existingRows.length, so it breaks)
    // 2. POST for C
    // 3. PATCH for A (with Id: 1)
    expect(client.request).toHaveBeenCalledTimes(3);
    
    // Check create payload
    expect(client.request).toHaveBeenCalledWith('POST', expect.stringContaining('records'), expect.objectContaining({
      body: [{ Email: 'c@ex.com', Name: 'C-new' }]
    }));

    // Check update payload
    expect(client.request).toHaveBeenCalledWith('PATCH', expect.stringContaining('records'), expect.objectContaining({
      body: [{ Email: 'a@ex.com', Name: 'A-updated', Id: 1 }]
    }));
  });

  it('fails on non-unique matches', async () => {
    client.request.mockResolvedValueOnce({
      list: [
        { Id: 1, Email: 'dup@ex.com' },
        { Id: 2, Email: 'dup@ex.com' },
      ],
      pageInfo: { totalRows: 2 }
    });

    const incoming = [{ Email: 'dup@ex.com', Name: 'Fail' }];

    process.argv = [
      'node', 'index.js', 'rows', 'bulk-upsert', 'table1',
      '--match', 'Email',
      '--data', JSON.stringify(incoming)
    ];

    // We expect handleError to be called or the process to exit, 
    // but in vitest with bootstrap() we can catch the error if it bubbles.
    // However, the CLI handles it with handleError. 
    // Let's mock console.error to verify the message.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await bootstrap();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple rows matched'));
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
