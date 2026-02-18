import express from 'express';
import compression from 'compression';
import { helmetMiddleware, corsMiddleware, getTrustProxy } from './config/security.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLoggerMiddleware } from './middleware/requestLogger.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { incrementRequestsServed } from './controllers/health.controller.js';
import env from './config/env.js';
import routes from './routes/index.js';

const app = express();

if (getTrustProxy()) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(helmetMiddleware());
app.use(compression());
app.use(requestIdMiddleware());
app.use(requestLoggerMiddleware());
app.use((req, res, next) => {
  incrementRequestsServed();
  next();
});
app.use(corsMiddleware());
app.use(globalLimiter);

app.use(express.json({ limit: env.BODY_LIMIT_BYTES }));

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
