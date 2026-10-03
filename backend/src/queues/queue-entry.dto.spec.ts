import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQueueEntryDto } from './dto/create-queue-entry.dto';

describe('CreateQueueEntryDto', () => {
  it.each(['<script>alert(1)</script>', 'Ana\nMaria', 'Ana123', ''])(
    'rejeita primeiro nome inválido: %s',
    async (firstName) => {
      const errors = await validate(
        plainToInstance(CreateQueueEntryDto, { firstName }),
      );
      expect(errors).not.toHaveLength(0);
    },
  );

  it('normaliza espaços no primeiro nome', async () => {
    const entry = plainToInstance(CreateQueueEntryDto, {
      firstName: '  Ana   Maria ',
    });
    expect(entry.firstName).toBe('Ana Maria');
    expect(await validate(entry)).toHaveLength(0);
  });
});
