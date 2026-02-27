import Email from "email-templates";
import emailConfig from "src/config/email.config";
import 'dotenv/config';
import { config } from "dotenv";
config();
async function sendEmail({ to, template, data }) {
    try {
        const email = new Email({
            message: { from: `My App <${process.env.EMAIL_FROM_ADDRESS}>` },
            send: true,
            transport: emailConfig,
            views: {
                root: 'src/shared/mail/templates/',
                options: { extension: 'pug' }
            }

        });
        await email.send({
            template: template,
            message: { to: to },
            locals: data,
        });
        console.log("Email sent successfully to", to);

    } catch (error) {
        console.error("Error sending email:", error);
    }
}

export default sendEmail;