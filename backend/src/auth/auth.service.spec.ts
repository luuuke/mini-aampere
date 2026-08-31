import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { UserRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const findUnique = vi.fn();
  const signAsync = vi.fn();
  const service = new AuthService(
    { user: { findUnique } } as unknown as PrismaService,
    { signAsync } as unknown as JwtService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a signed token and safe user for valid credentials', async () => {
    const passwordHash = await hash('Aampere123!', 4);
    findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'admin@aampere.test',
      passwordHash,
      name: 'Aampere Admin',
      dealershipName: null,
      role: UserRole.ADMIN,
    });
    signAsync.mockResolvedValue('signed-token');

    await expect(
      service.login({
        email: 'admin@aampere.test',
        password: 'Aampere123!',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'user-id',
        email: 'admin@aampere.test',
        name: 'Aampere Admin',
        dealershipName: null,
        role: UserRole.ADMIN,
      },
    });

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'admin@aampere.test' },
      }),
    );
    expect(signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'admin@aampere.test',
      role: UserRole.ADMIN,
    });
  });

  it('rejects an unknown email with the generic credentials error', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'password' }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password',
    });
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password with the same generic error', async () => {
    findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'admin@aampere.test',
      passwordHash: await hash('Aampere123!', 4),
      name: 'Aampere Admin',
      dealershipName: null,
      role: UserRole.ADMIN,
    });

    await expect(
      service.login({
        email: 'admin@aampere.test',
        password: 'incorrect',
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password',
    });
    expect(signAsync).not.toHaveBeenCalled();
  });
});
