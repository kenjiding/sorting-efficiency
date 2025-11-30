import serverlessExpress from '@vendia/serverless-express';
import { app, connectDatabase } from './app.js';

let serverlessHandler;

const bootstrap = async () => {
  if (!serverlessHandler) {
    await connectDatabase();
    serverlessHandler = serverlessExpress({ app });
  }

  return serverlessHandler;
};

export const handler = async (event, context) => {
  const handlerInstance = await bootstrap();
  return handlerInstance(event, context);
};

