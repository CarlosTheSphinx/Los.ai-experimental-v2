import type { Express, Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../auth';

export interface RouteDeps {
  storage: any;
  db: any;
  authenticateUser: any;
  requireAdmin: any;
  requireOnboarding: any;
  requirePermission: (permission: string) => any;
  objectStorageService: any;
  client?: any; // Apify client
}

export type RouteRegistrationFunction = (app: Express, deps: RouteDeps) => void | Promise<void>;
