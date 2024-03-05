import { Hono } from 'hono';

import { userRouter } from './routes/user';
import { blogRouter } from './routes/blog';
import { Env, Variables } from './hono_bindings';

const app = new Hono<{
	Bindings: Env;
	Variables: Variables;
}>();

app.get('/', async (c) => {
	return c.text('Hello Hono!');
});

app.route('/api/v1/user', userRouter);
app.route('/api/v1/blog', blogRouter);

export default app;
