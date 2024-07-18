import { serve } from '@hono/node-server';
import cudis from './cudis/route';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import 'dotenv/config';
import actionsJson from './actions.json';
const environment = process.argv[2];
console.log('Environment:', environment);
const app = new OpenAPIHono();
app.use('/*', cors());

// <--Actions-->
app.route('/api/cudis', cudis);
// </--Actions-->

app.get('/actions.json', (c) => {
  return c.json(actionsJson);
});

// app.doc('/doc', {
//   info: {
//     title: 'An API',
//     version: 'v1',
//   },
//   openapi: '3.1.0',
// });

// app.get(
//   '/swagger-ui',
//   swaggerUI({
//     url: '/doc',
//   }),
// );

const port = environment === 'production' ? 4000 : 3000;
console.log(
  `Server is running on port ${port}
Visit http://localhost:${port}/swagger-ui to explore existing actions
Visit https://actions.dialect.to to unfurl action into a Blink
`,
);

serve({
  fetch: app.fetch,
  port,
});
