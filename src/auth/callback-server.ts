import http from "node:http";
import type { Logger } from "pino";

interface CallbackResult {
  code: string;
  state: string;
}

export function startCallbackServer(
  port: number,
  expectedState: string,
  logger: Logger,
): { promise: Promise<CallbackResult>; close: () => void } {
  let server: http.Server;

  const promise = new Promise<CallbackResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server?.close();
      reject(new Error("OAuth callback timed out after 120 seconds"));
    }, 120_000);

    server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${port}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const error = url.searchParams.get("error");
      if (error) {
        const description = url.searchParams.get("error_description") ?? error;
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          `<html><body><h1>Authentication Failed</h1><p>Error: ${description}</p></body></html>`,
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error(`OAuth error: ${description}`));
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h1>Bad Request</h1><p>Missing code or state parameter</p></body></html>",
        );
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h1>Invalid State</h1><p>State mismatch — possible CSRF attack</p></body></html>",
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error("OAuth state mismatch"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body><h1>LinkedIn Connected!</h1><p>You can close this window and return to your terminal.</p></body></html>",
      );

      clearTimeout(timeout);
      server.close();
      logger.info("OAuth callback received successfully");
      resolve({ code, state });
    });

    server.listen(port, () => {
      logger.info({ port }, "OAuth callback server listening");
    });

    server.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  return {
    promise,
    close: () => server?.close(),
  };
}
