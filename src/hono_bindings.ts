export interface Env {
	[key: string]: string;
	DATABASE_URL: string;
	JWT_SECRET: string;
}

export interface Variables {
	[key: string]: string;
	userId: string;
}
