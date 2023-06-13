import { z } from 'zod';

import { env } from '$env/dynamic/private';

const validator = z.object({
	code: z.string()
});

const commonHeaders = {
	'ACCESS-CONTROL-ALLOW-ORIGIN': 'http://localhost:5173',
	'Access-Control-Request-Headers': 'Content-Type'
} as const;

export async function POST({ request }: { request: Request }) {
	try {
		const body = await request.json();

		console.log('foo');

		validator.parse(body);
		const { code } = body;

		console.log({ code }, env.GITHUB_CLIENT_ID);

		const formData = new FormData();
		formData.set('client_id', env.GITHUB_CLIENT_ID);
		formData.set('client_secret', env.GITHUB_CLIENT_SECRET);
		formData.set('code', code);

		const response = await fetch('https://github.com/login/oauth/access_token/', {
			method: 'POST',
			body: JSON.stringify({
				code,
				client_id: env.GITHUB_CLIENT_ID,
				client_secret: env.GITHUB_CLIENT_SECRET,
				redirect_uri: `http://localhost:5173/app/auth/callback/github`
			}),
			// body: formData,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			}
		});

		const responseBody = await response.json();
		console.log({ responseBody }, response.status);
		if (responseBody.error_description) {
			throw new Error(responseBody.error_description);
		}

		return new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: commonHeaders
		});
	} catch (e: any) {
		console.log(e);
		return new Response(JSON.stringify({ e }), {
			status: 400,
			headers: commonHeaders
		});
	}
}

// If `OPTIONS` is not defined, Next.js will automatically implement `OPTIONS` and  set the appropriate Response `Allow` header depending on the other methods defined in the route handler.
// export async function OPTIONS(request: Request) {}
