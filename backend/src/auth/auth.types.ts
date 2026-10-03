import { OrganizationRole } from '@prisma/client';

export interface AuthenticatedSession {
  sessionId: string;
  userId: string;
  organizationId: string;
  membershipId: string;
  role: OrganizationRole;
}
