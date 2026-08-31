import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/client.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const getAllAndOverride = vi.fn();
  const verifyAsync = vi.fn();
  const reflector = { getAllAndOverride } as unknown as Reflector;
  const jwtService = { verifyAsync } as unknown as JwtService;
  const guard = new JwtAuthGuard(jwtService, reflector);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createContext(authorization?: string) {
    const request = { headers: { authorization } };
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  it('allows routes marked public without a token', async () => {
    getAllAndOverride.mockReturnValue(true);
    const { context } = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('verifies a bearer token and attaches its user claims', async () => {
    getAllAndOverride.mockReturnValue(false);
    verifyAsync.mockResolvedValue({
      sub: 'dealer-id',
      email: 'dealer@example.com',
      role: UserRole.DEALER,
    });
    const { context, request } = createContext('Bearer signed-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAsync).toHaveBeenCalledWith('signed-token');
    expect(request).toHaveProperty('user', {
      id: 'dealer-id',
      email: 'dealer@example.com',
      role: UserRole.DEALER,
    });
  });

  it('rejects a missing token', async () => {
    getAllAndOverride.mockReturnValue(false);
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401,
    });
  });
});
