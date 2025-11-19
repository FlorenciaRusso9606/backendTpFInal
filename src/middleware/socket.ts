import { Request, Response, NextFunction } from "express";

export const attachIO = (io: any) => (req: Request, res: Response, next: NextFunction) => {
  (req as any).io = io;
  next();
};
