import { compare, hash } from "bcryptjs";

const ROUNDS = 12;

export const hashPassword = (password: string) => hash(password, ROUNDS);
export const verifyPassword = (password: string, passwordHash: string) =>
  compare(password, passwordHash);