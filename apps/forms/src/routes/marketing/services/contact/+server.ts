import { z } from 'zod';
import nodemailer from 'nodemailer';
import { validate } from 'deep-email-validator';

import { SMTP_SERVER, SMTP_SENDER, SMTP_PASSWORD, WEB_BASE_URL } from '$env/static/private';

const SERVICES_RECIPIENT = 'services@vexilla.dev';

const validator = z.object({
	name: z.string(),
	email: z.string(),
	message: z.string(),
	company: z.undefined().optional()
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
		console.log('Marketing/Services/Contact: Passed body validation.');
		const { name, email, message } = body;

		const emailValidation = await validateEmail(email);

		if (!emailValidation.valid) {
			throw new Error(`Email failed validation for ${emailValidation.reason}`);
		}

		console.log('Marketing/Services/Contact: Passed email validation.');

		const transporter = nodemailer.createTransport({
			host: SMTP_SERVER,
			port: 587,
			// secure: true,
			secure: false,
			auth: {
				user: SMTP_SENDER,
				pass: SMTP_PASSWORD
			}
		});

		console.log('Marketing/Services/Contact: Transport created.');

		await transporter.sendMail({
			from: email,
			subject: emailSubject,
			to: SERVICES_RECIPIENT,
			text: `
Sender Name: ${name}
Sender Email: ${email}
Message: ${message}
`
		});

		console.log('Marketing/Services/Contact: Email sent.');
	} catch (e: any) {
		// Maybe instead of setting Response we should just notify a logging server of the spam attempt. For now, just let Netlify log the errors
		console.error(e);
	} finally {
		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: commonHeaders
		});
	}
}

async function validateEmail(email: string) {
	const results = await Promise.all([
		validate({
			email,
			sender: email,
			validateRegex: true
		}),
		validate({
			email,
			sender: email,
			validateMx: true
			// this might be overkill
			// validateSMTP: true
		}),
		validate({
			email,
			sender: email,
			validateTypo: true
		}),
		validate({
			email,
			sender: email,
			validateDisposable: true
		})
	]);

	const reason = results
		.filter((result) => !result.valid)
		.map((result) => result.reason)
		.join(',');

	return {
		valid: !reason,
		reason
	};
}

// If `OPTIONS` is not defined, Next.js will automatically implement `OPTIONS` and  set the appropriate Response `Allow` header depending on the other methods defined in the route handler.
// What about Sveltekit?
// export async function OPTIONS(request: Request) {}
