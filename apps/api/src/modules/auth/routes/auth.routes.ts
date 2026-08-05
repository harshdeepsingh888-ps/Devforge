import type { FastifyPluginAsync } from "fastify";

import type {
  RegisterInput,
} from "../authentication.types.js";
import type { AuthenticationService } from "../services/authentication/authentication.service.js";

export interface AuthRoutesOptions {
  authenticationService: AuthenticationService;
}

interface RegisterRoute {
  Body: RegisterInput;
}

export const authRoutes: FastifyPluginAsync<
  AuthRoutesOptions
> = async (app, options) => {
  app.post<RegisterRoute>(
    "/register",
    async (request, reply) => {
      const result =
        await options.authenticationService.register(
          request.body,
        );

      return reply.code(201).send(result);
    },
  );
};