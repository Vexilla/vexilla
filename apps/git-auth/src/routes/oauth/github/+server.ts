import { z } from 'zod';

import { env } from '$env/dynamic/private';

const validator = z.object({
	code: z.string()
});

const commonHeaders = {
	'ACCESS-CONTROL-ALLOW-ORIGIN': env.APP_BASE_URL,
	'Access-Control-Request-Headers': 'Content-Type'
} as const;

export async function POST({ request }: { request: Request }) {
	try {
		const body = await request.json();

		validator.parse(body);
		const { code } = body;

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
				redirect_uri: `${env.APP_BASE_URL}/auth/callback/github`
			}),
			// body: formData,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json'
			}
		});

		const responseBody = await response.json();
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
// What about Sveltekit?
export async function OPTIONS(request: Request) {
	return new Response(JSON.stringify({}), {
		status: 200,
		headers: commonHeaders
	});
}
