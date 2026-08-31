import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const getAllAndOverride = vi.fn();
  const guard = new RolesGuard({ getAllAndOverride } as unknown as Reflector);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createContext(role?: UserRole) {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: role
            ? { id: 'user-id', email: 'user@example.com', role }
            : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows endpoints without role metadata', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows users with a required role', () => {
    getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(createContext(UserRole.ADMIN))).toBe(true);
  });

  it('rejects users without a required role', () => {
    getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(createContext(UserRole.DEALER))).toBe(false);
  });
});
