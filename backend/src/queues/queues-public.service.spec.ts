import { QueueStatus } from '@prisma/client';
import { QueuesService } from './queues.service';

describe('QueuesService - entrada pública', () => {
  const queue = {
    id: 'queue-id',
    name: 'Atendimento',
    organizationId: 'organization-id',
    status: QueueStatus.OPEN,
  };

  it('calcula a posição no servidor dentro de transação', async () => {
    const transaction = {
      queue: { findUnique: jest.fn().mockResolvedValue(queue) },
      $executeRaw: jest.fn().mockResolvedValue(1),
      queueEntry: {
        aggregate: jest.fn().mockResolvedValue({ _max: { position: 2 } }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new QueuesService(
      prisma as never,
      { emitQueueUpdated: jest.fn() } as never,
    );

    await expect(
      service.enterPublicQueue('seguro', { firstName: 'Ana' }),
    ).resolves.toEqual(
      expect.objectContaining({
        queueName: 'Atendimento',
        firstName: 'Ana',
        position: 3,
        publicToken: expect.any(String),
      }),
    );
    expect(transaction.queueEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        position: 3,
        organizationId: 'organization-id',
      }),
    });
  });

  it('não permite entrada em fila inativa', async () => {
    const transaction = {
      queue: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...queue, status: QueueStatus.PAUSED }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new QueuesService(
      prisma as never,
      { emitQueueUpdated: jest.fn() } as never,
    );
    await expect(
      service.enterPublicQueue('pausada', { firstName: 'Ana' }),
    ).rejects.toThrow('Fila pública não encontrada');
  });
});
