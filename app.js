import compression from "compression";
import express from "express";
import morgan from "morgan";
import { createRequestHandler } from "@react-router/express";

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const app = express();

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

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

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/", (_req, res) => {
  res.status(200).send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Invoice Subscription Portal</title>
      </head>
      <body style="font-family: system-ui, sans-serif; padding: 32px;">
        <h1>Invoice Subscription Portal</h1>
        <p>App server is running.</p>
      </body>
    </html>
  `);
});

try {
  const build = await import("./build/server/index.js");
  app.all(
    "*",
    createRequestHandler({
      build,
      mode: process.env.NODE_ENV,
    }),
  );
} catch (error) {
  console.error("React Router build could not be loaded:", error);
  app.all("*", (_req, res) => {
    res.status(500).send("App server started, but the React Router build could not be loaded.");
  });
}

app.listen(port, host, () => {
  console.log(`Invoice Subscription Portal listening on ${host}:${port}`);
});
