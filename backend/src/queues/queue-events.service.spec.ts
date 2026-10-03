import { firstValueFrom, take } from 'rxjs';
import { QueueEventsService } from './queue-events.service';

describe('QueueEventsService', () => {
  it('isola eventos entre filas', async () => {
    const service = new QueueEventsService();
    const queueA = firstValueFrom(service.stream('fila-a').pipe(take(1)));
    const queueB = service.stream('fila-b').pipe(take(1));
    let receivedOnB = false;
    queueB.subscribe(() => {
      receivedOnB = true;
    });
    service.emitQueueUpdated('fila-a');
    await expect(queueA).resolves.toMatchObject({ type: 'queue.updated' });
    expect(receivedOnB).toBe(false);
  });
});
