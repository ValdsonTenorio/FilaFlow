import { QueuesService } from './queues.service';

describe('QueuesService', () => {
  it('sempre filtra filas pela organização da sessão', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new QueuesService(
      { queue: { findMany } } as never,
      {} as never,
    );
    await service.list({ organizationId: 'org-a' } as never);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-a' } }),
    );
  });

  it('não encontra recurso de outra organização', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new QueuesService(
      { queue: { findFirst } } as never,
      {} as never,
    );
    await expect(
      service.getById({ organizationId: 'org-a' } as never, 'fila-da-org-b'),
    ).rejects.toThrow('Fila não encontrada');
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fila-da-org-b', organizationId: 'org-a' },
      }),
    );
  });

  it('gera slug público no backend sem aceitar um slug enviado pelo cliente', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'fila-1',
      name: 'Atendimento',
      publicSlug: 'seguro',
      status: 'OPEN',
    });
    const service = new QueuesService(
      { queue: { create } } as never,
      {} as never,
    );

    await service.create(
      { organizationId: 'org-a' } as never,
      { name: 'Atendimento', publicSlug: 'tentativa-manual' } as never,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-a',
          publicSlug: expect.stringMatching(/^[A-Za-z0-9_-]{24}$/),
        }),
      }),
    );
  });
});
