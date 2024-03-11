import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { sign } from 'hono/jwt';
import { Env, Variables } from '../hono_bindings';
import { signupInput, signinInput } from '@shivamdhaka/medium-common';

export const userRouter = new Hono<{
	Bindings: Env;
	Variables: Variables;
}>();

userRouter.get('/', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

	try {
		const users = await prisma.user.findMany();
		return c.json(users);
	} catch (error) {
		return c.json({
			statusCode: 403,
			error: error,
		});
	}
});

userRouter.post('/signup', async (c) => {
	//create new prismaClient
	const data = await c.req.json();
	console.log(data);
	const { success } = signupInput.safeParse(data);

	if (!success) {
		c.status(403);
		return c.json({
			error: 'Invalid data',
		});
	}

	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

	console.log(data);

	try {
		const user = await prisma.user.create({
			data: {
				email: data.email,
				password: data.password,
				name: data?.name,
			},
		});

		const token = await sign(
			{
				id: user.id,
				email: user.email,
			},
			c.env.JWT_SECRET
		);
		return c.json({ token });
	} catch (error) {
		return c.json({
			statusCode: 403,
			error: error,
		});
	}
});

userRouter.post('/signin', async (c) => {
	const data = await c.req.json();
	const { success } = signinInput.safeParse(data);

	if (!success) {
		c.status(403);
		return c.json({
			error: 'Invalid data',
		});
	}

	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

	console.log(data);

	try {
		const user = await prisma.user.findUnique({
			where: {
				email: data.email,
			},
		});

		if (!user) {
			c.status(403);
			return c.json({ error: 'User not found' });
		}

		const validPassword = user.password === data.password;
		console.log(user.password);
		if (!validPassword) {
			c.status(403);
			return c.json({ error: 'Invalid Password' });
		}

		const token = await sign(
			{
				id: user.id,
				email: user.email,
			},
			c.env.JWT_SECRET
		);

		return c.json({ token });
	} catch (error) {
		return c.status(403);
	}
});
