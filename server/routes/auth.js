import express from "express";
import { login, updateprofile, updateplan, verifyLoginOTP, updateTheme } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", updateprofile);
routes.patch("/updateplan/:id", updateplan);
routes.post("/verify-otp", verifyLoginOTP);
routes.patch("/update-theme/:id", updateTheme);
export default routes;
