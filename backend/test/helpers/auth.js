import { signToken } from '../../src/config/jwt.js';

export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
export const OTHER_ID = '33333333-3333-4333-8333-333333333333';

export const tokenFor = (id, role = 'user') => signToken({ sub: id, role });
export const bearer = (token) => `Bearer ${token}`;
export const userAuth = () => bearer(tokenFor(USER_ID, 'user'));
export const adminAuth = () => bearer(tokenFor(ADMIN_ID, 'admin'));
