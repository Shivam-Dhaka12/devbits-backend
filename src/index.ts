import { Hono } from 'hono';

import { cors } from 'hono/cors';
import { userRouter } from './routes/user';
import { blogRouter } from './routes/blog';
import { Env, Variables } from './hono_bindings';

const app = new Hono<{
	Bindings: Env;
	Variables: Variables;
}>();

app.use(
	cors({
		origin: 'http://localhost:5173',
		credentials: true,
	})
);

// app.use('*', async (c, next) => {
// 	const corsMiddlewareHandler = cors({
// 		origin: c.env.FRONTEND_URL,
// 		credentials: true,
// 	})
// 	return corsMiddlewareHandler(c, next)
//   })

app.get('/', async (c) => {
	return c.text('Hello Hono!');
});

app.route('/api/v1/user', userRouter);
app.route('/api/v1/blog', blogRouter);

export default app;
