import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type QueueEvent = { type: 'queue.updated'; occurredAt: string };

@Injectable()
export class QueueEventsService {
  private readonly streams = new Map<string, Subject<QueueEvent>>();

  stream(queueId: string): Observable<QueueEvent> {
    return this.getStream(queueId).asObservable();
  }
  emitQueueUpdated(queueId: string): void {
    this.getStream(queueId).next({
      type: 'queue.updated',
      occurredAt: new Date().toISOString(),
    });
  }

  private getStream(queueId: string): Subject<QueueEvent> {
    let stream = this.streams.get(queueId);
    if (!stream) {
      stream = new Subject<QueueEvent>();
      this.streams.set(queueId, stream);
    }
    return stream;
  }
}
