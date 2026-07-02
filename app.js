import compression from "compression";
import express from "express";
import morgan from "morgan";
import { createRequestHandler } from "@react-router/express";

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const build = await import("./build/server/index.js");
const app = express();

app.disable("x-powered-by");
app.use(compression());
app.use(
  "/assets",
  express.static("build/client/assets", {
    immutable: true,
    maxAge: "1y",
  }),
);
app.use(express.static("build/client", { maxAge: "1h" }));
app.use(express.static("public", { maxAge: "1h" }));
app.use(morgan("tiny"));
app.all(
  "*",
  createRequestHandler({
    build,
    mode: process.env.NODE_ENV,
  }),
);

app.listen(port, host, () => {
  console.log(`Invoice Subscription Portal listening on ${host}:${port}`);
});
