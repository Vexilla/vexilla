import { z } from 'zod';
import nodemailer from 'nodemailer';

import { SMTP_SERVER, SMTP_SENDER, SMTP_PASSWORD, WEB_BASE_URL } from '$env/static/private';

const validator = z.object({
	name: z.string(),
	email: z.string(),
	message: z.string(),
	company: z.undefined()
});

const commonHeaders = {
	'ACCESS-CONTROL-ALLOW-ORIGIN': WEB_BASE_URL,
	'Access-Control-Request-Headers': 'Content-Type'
} as const;

const emailSubject = 'Services Form Submission';

export async function POST({ request }: { request: Request }) {
	try {
		const body = await request.json();

		validator.parse(body);
		const { name, email, message } = body;

		const transporter = nodemailer.createTransport({
			host: SMTP_SERVER,
			port: 587,
			secure: true,
			auth: {
				user: SMTP_SENDER,
				pass: SMTP_PASSWORD
			}
		});

		await transporter.sendMail({
			from: email,
			subject: emailSubject,
			text: `
Sender Name: ${name}
Sender Email: ${email}
Message: ${message}
`
		});
	} catch (e: any) {
		// Maybe instead of setting Response we should just notify a logging server of the spam attempt. For now, just let Netlify log the errors
		console.error(e);
		// return new Response(JSON.stringify({ e }), {
		// 	status: 400,
		// 	headers: commonHeaders
		// });
	} finally {
		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: commonHeaders
		});
	}
}

// If `OPTIONS` is not defined, Next.js will automatically implement `OPTIONS` and  set the appropriate Response `Allow` header depending on the other methods defined in the route handler.
// What about Sveltekit?
// export async function OPTIONS(request: Request) {}
