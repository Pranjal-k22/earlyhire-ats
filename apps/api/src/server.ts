import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";

const startServer = async () => {
  try {
    // Connect to database before accepting requests
    await connectDB();

    const server = app.listen(env.PORT, env.HOST, () => {
      console.log(`🚀 EarlyAI ATS API server listening on http://${env.HOST}:${env.PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
      console.log(`   Health check: http://${env.HOST === "0.0.0.0" ? "localhost" : env.HOST}:${env.PORT}/api/v1/health`);
    });

    const handleShutdown = (signal: string) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log("HTTP server closed.");
        try {
          await disconnectDB();
        } catch (err) {
          console.error("Error disconnecting from database:", err);
        }
        process.exit(0);
      });

      setTimeout(() => {
        console.error("Forcing shutdown after timeout.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server due to connection error:", error);
    process.exit(1);
  }
};

startServer();


