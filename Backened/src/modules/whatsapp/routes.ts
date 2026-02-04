import { Router } from "express";
import {
  handleWebhook,
  testChat,
  testFlow,
  verifyWebhook,
} from "./controllers/whatsapp.controller";

const router = Router();

router.get("/webhook", verifyWebhook);
router.post("/webhook", handleWebhook);
router.post("/test/chat", testChat);
router.post("/test/flow", testFlow);

export default router;


