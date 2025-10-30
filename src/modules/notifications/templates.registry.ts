export interface NotificationTemplate {
  renderEmail?(
    ctx: any,
  ): { subject: string; text?: string; html?: string } | undefined;
  renderInapp?(ctx: any): { title: string; body?: string };
  renderPush?(ctx: any): { title: string; body?: string } | undefined;
}

const templates: Record<string, NotificationTemplate> = {
  'booking.confirmed': {
    renderEmail: (ctx: any) => ({
      subject: 'Booking Confirmed',
      html: `<p>Your booking #${ctx.bookingId} is confirmed!</p>`,
    }),
    renderInapp: (ctx: any) => ({
      title: 'Booking confirmed',
      body: `Booking #${ctx.bookingId} confirmed`,
    }),
    renderPush: (ctx: any) => ({
      title: 'Booking confirmed',
      body: `Your booking has been confirmed`,
    }),
  },
  'booking.cancelled': {
    renderEmail: (ctx: any) => ({
      subject: 'Booking Cancelled',
      html: `<p>Your booking #${ctx.bookingId} has been cancelled.</p>`,
    }),
    renderInapp: (ctx: any) => ({
      title: 'Booking cancelled',
      body: `Booking #${ctx.bookingId} cancelled`,
    }),
  },
  'payment.succeeded': {
    renderEmail: (ctx: any) => ({
      subject: 'Payment Received',
      html: `<p>Payment of ${ctx.amount} received for booking #${ctx.bookingId}</p>`,
    }),
    renderInapp: (ctx: any) => ({
      title: 'Payment received',
      body: `Payment processed: ${ctx.amount}`,
    }),
  },
  'review.created': {
    renderEmail: (ctx: any) => ({
      subject: 'New Review',
      html: `<p>You received a new review: ${ctx.rating} stars</p>`,
    }),
    renderInapp: (ctx: any) => ({
      title: 'New review',
      body: `${ctx.rating} stars - ${ctx.comment?.slice(0, 50)}...`,
    }),
  },
};

export function getTemplate(key: string): NotificationTemplate | undefined {
  return templates[key];
}
