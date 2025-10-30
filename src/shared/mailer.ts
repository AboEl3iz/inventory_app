import Email from "email-templates";
import emilConfig from "src/config/email.config";
import 'dotenv/config';
import { config } from "dotenv";
config();
async function sendEmail({to, templete , data}) {
    try {
        const email = new Email({
            message: { from: `My App <${process.env.EMAIL_FROM}>` },
            send: true,
            transport: emilConfig,
            views: {
                root: 'src/shared/mail/templates/',
                options: { extension: 'pug' }
            }
        
        });
        await email.send({
            template: templete,
            message: { to: to },
            locals: data,
        });
        console.log("Email sent successfully to", to);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

export default sendEmail;