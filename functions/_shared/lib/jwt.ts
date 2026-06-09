import { sign, verify } from 'hono/jwt';

export interface JwtPayload {
  user_id: number;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

export async function generateToken(
  userId: number,
  secret: string,
  expiresInSeconds: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    user_id: userId,
    iat: now,
    exp: now + expiresInSeconds,
  };
  return sign(payload, secret, 'HS256');
}

export async function verifyToken(token: string, secret: string): Promise<JwtPayload> {
  const payload = await verify(token, secret, 'HS256');
  return payload as unknown as JwtPayload;
}
