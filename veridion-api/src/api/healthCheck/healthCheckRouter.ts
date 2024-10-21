import express, { type Request, type Response, type Router } from "express";
import { ServiceResponse } from "@/models/serviceResponse";
import { handleServiceResponse } from "@/utils/httpHandlers";

export const healthCheckRouter: Router = express.Router();

healthCheckRouter.get("/", (_req: Request, res: Response): void => {
  const serviceResponse = ServiceResponse.success("Service is healthy", null);
  handleServiceResponse(serviceResponse, res);
});
