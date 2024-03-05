import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { verify } from 'hono/jwt';
import { Env, Variables } from '../hono_bindings';
import { createPostInput, updatePostInput } from '@shivamdhaka/medium-common';

export const blogRouter = new Hono<{
	Bindings: Env;
	Variables: Variables;
}>();

blogRouter.use('*', async (c, next) => {
	// retrieve token
	try {
		const token = c.req.header('Authorization')?.split(' ')[1];

		if (token) {
			const decoded = await verify(token, c.env.JWT_SECRET);
			c.set('userId', decoded.id);

			await next();
		} else {
			return c.json({
				error: 'Missing auth token',
			});
		}
	} catch (error) {
		return c.json({
			msg: 'Invalid token',
			error: error,
		});
	}
});

blogRouter.post('', async (c) => {
	//
	const data = await c.req.json();
	const { success } = createPostInput.safeParse(data);

	if (!success) {
		c.status(403);
		return c.json({
			error: 'Invalid data',
		});
	}
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

	const blog = await prisma.blog.create({
		data: {
			title: data.title,
			content: data.content,
			authorId: c.get('userId'),
		},
	});
	return c.json({
		status: 201,
		message: 'Blog created',
		data: blog,
	});
});

blogRouter.put('/:id', async (c) => {
	//
	try {
		//
		const data = await c.req.json();
		const { success } = updatePostInput.safeParse(data);

		if (!success) {
			c.status(403);
			return c.json({
				error: 'Invalid data',
			});
		}

		const prisma = new PrismaClient({
			datasourceUrl: c.env?.DATABASE_URL,
		}).$extends(withAccelerate());

		const blog = await prisma.blog.update({
			data: {
				title: data.title,
				content: data.content,
				authorId: c.env.userId,
			},
			where: {
				id: c.req.param('id'),
			},
		});
		return c.json({
			status: 203,
			message: 'Blog updated',
			data: blog,
		});
	} catch (error) {
		console.log(error);
		return c.json({
			error,
		});
	}
});

blogRouter.get('/all', async (c) => {
	//
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

	const blogs = await prisma.blog.findMany({
		where: {
			authorId: c.get('userId'),
		},
	});

	console.log(blogs);

	return c.json({
		status: 200,
		message: 'Successfully fetched all blog',
		data: {
			blogs,
		},
	});
});

blogRouter.get('/:id', async (c) => {
	//
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

	try {
		const blog = await prisma.blog.findUnique({
			where: {
				id: c.req.param('id'),
			},
		});

		if (blog) {
			return c.json({
				status: 200,
				message: 'Successfully fetched blog',
				data: blog,
			});
		} else {
			return c.json({
				status: 404,
				message: 'Blog not found',
			});
		}
	} catch (error) {
		return c.json({
			status: 404,
			error: error,
		});
	}
});
