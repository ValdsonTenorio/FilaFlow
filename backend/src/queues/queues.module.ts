import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueuesController } from './queues.controller';
import { QueueAttendanceService } from './queue-attendance.service';
import { QueueEventsService } from './queue-events.service';
import { QueuesService } from './queues.service';

@Module({
  imports: [AuthModule],
  controllers: [QueuesController],
  providers: [QueuesService, QueueAttendanceService, QueueEventsService],
})
export class QueuesModule {}
