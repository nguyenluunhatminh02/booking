import { OutboxStatus } from '@prisma/client';
import { OutboxEventService } from './outbox-event.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('OutboxEventService', () => {
  let service: OutboxEventService;
  const updateMock = jest.fn();
  const deleteManyMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    updateMock.mockResolvedValue({ id: 'evt-1' });
    deleteManyMock.mockResolvedValue({ count: 2 });

    service = new OutboxEventService({
      outboxEvent: {
        update: updateMock,
        deleteMany: deleteManyMock,
      },
    } as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('retryEvent resets status, clears error and bumps attempts', async () => {
    await service.retryEvent('evt-1');

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: {
        status: OutboxStatus.PENDING,
        attempts: { increment: 1 },
        error: null,
      },
    });
  });

  it('cleanupSentEvents removes sent events older than threshold', async () => {
    const result = await service.cleanupSentEvents(48);

    expect(deleteManyMock).toHaveBeenCalledTimes(1);

    const callArgs = deleteManyMock.mock.calls[0][0];
    expect(callArgs.where.status).toBe(OutboxStatus.SENT);
    expect(callArgs.where.sentAt.lt).toBeInstanceOf(Date);
    expect(callArgs.where.sentAt.lt.toISOString()).toBe(
      '2023-12-30T00:00:00.000Z',
    );
    expect(result).toEqual({ count: 2 });
  });
});
