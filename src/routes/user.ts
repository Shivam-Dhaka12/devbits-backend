import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { sign } from 'hono/jwt';
import { ZodError } from 'zod';
import { Env, Variables } from '../hono_bindings';
import { signupInput, signinInput } from '@shivamdhaka/medium-common';
import { setCookie } from 'hono/cookie';

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
	const { success, error }: { success: boolean; error?: ZodError } =
		signupInput.safeParse(data);

	if (!success) {
		c.status(403);
		return c.json({
			error: error?.message,
		});
	}

	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

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
				expiredAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, //7 days
			},
			c.env.JWT_SECRET
		);
		setCookie(c, 'token', token, {
			httpOnly: false,
			sameSite: 'None',
		});
		return c.json({
			id: user.id,
			email: user.email,
			username: user.name,
		});
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

	try {
		const user = await prisma.user.findUnique({
			where: {
				email: data.email,
			},
		});

		if (!user) {
			c.status(400);
			return c.json({ error: 'User not found' });
		}

		const validPassword = user.password === data.password;
		if (!validPassword) {
			c.status(400);
			return c.json({ error: 'Invalid Password' });
		}

		const token = await sign(
			{
				id: user.id,
				email: user.email,
			},
			c.env.JWT_SECRET
		);

		setCookie(c, 'token', token, {
			httpOnly: false,
			sameSite: 'Lax',
		});

		return c.json({
			id: user.id,
			email: user.email,
			username: user.name,
		});
	} catch (error) {
		return c.status(403);
	}
});

userRouter.post('/guest-signin', async (c) => {
	try {
		const data = await c.req.json();
		const { success } = signinInput.safeParse(data);

		if (!success) {
			c.status(403);
			return c.json({
				error: 'Invalid data',
			});
		}
		const guestToken = generateGuestToken();
		console.log('Guest token: ', guestToken);

		setCookie(c, 'token', guestToken, {
			httpOnly: false,
			sameSite: 'Lax',
		});

		return c.json({
			id: guestToken,
			email: user.email,
			username: user.name,
		});
	} catch (error) {
		return c.status(403);
	}
});

function generateGuestToken() {
	return 'GUEST_' + Math.random().toString(16) + Date.now().toString(16);
}
