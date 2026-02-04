import { Router } from "express";
import whatsappModuleRouter from "../modules/whatsapp/routes";

const router = Router();

router.use("/", whatsappModuleRouter);

export default router;
