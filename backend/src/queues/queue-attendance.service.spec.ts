import { ConflictException } from '@nestjs/common';
import { QueueEntryStatus, QueueStatus } from '@prisma/client';
import { QueueAttendanceService } from './queue-attendance.service';

describe('QueueAttendanceService', () => {
  const session = { organizationId: 'org-1' } as never;

  it('chama somente o primeiro cliente aguardando e emite atualização', async () => {
    const transaction = {
      queue: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'queue-1', status: QueueStatus.OPEN }),
      },
      queueEntry: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'entry-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const events = { emitQueueUpdated: jest.fn() };
    const service = new QueueAttendanceService(
      { $transaction: jest.fn((callback) => callback(transaction)) } as never,
      events as never,
    );

    await service.callNext(session, 'queue-1');

    expect(transaction.queueEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: QueueEntryStatus.IN_SERVICE }),
      }),
    );
    expect(events.emitQueueUpdated).toHaveBeenCalledWith('queue-1');
  });

  it('bloqueia duas chamadas simultâneas quando já há atendimento', async () => {
    const transaction = {
      queue: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'queue-1', status: QueueStatus.OPEN }),
      },
      queueEntry: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'entry-atual',
          status: QueueEntryStatus.IN_SERVICE,
        }),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const service = new QueueAttendanceService(
      { $transaction: jest.fn((callback) => callback(transaction)) } as never,
      {} as never,
    );
    await expect(service.callNext(session, 'queue-1')).rejects.toThrow(
      ConflictException,
    );
  });
});
