import {
  Algorithm,
  hash,
  verify,
  type Options,
} from "@node-rs/argon2";

const ARGON2_OPTIONS: Options = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

export interface PasswordService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(
    passwordHash: string,
    password: string,
  ): Promise<boolean>;
}

export class Argon2PasswordService
  implements PasswordService
{
  async hashPassword(
    password: string,
  ): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  async verifyPassword(
    passwordHash: string,
    password: string,
  ): Promise<boolean> {
    return verify(passwordHash, password);
  }
}