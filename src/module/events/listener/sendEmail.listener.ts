import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject } from "@nestjs/common";
import { Job } from "bullmq";
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import sendEmail from "src/shared/mail/mailer";
import { Logger  } from 'winston';
@Processor('EMAIL_QUEUE')
export class EmailProcessor extends WorkerHost {
    process(job: Job, token?: string): Promise<any> {
        this.logger.warn(`there is a job for handle with job name ${job.name} `)
        return this.handleSendEmail(job);
    }

    constructor(@Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,) {
        super();
    }

    async handleSendEmail(job: Job) {
        const { to, template, data } = job.data;

        try {
            this.logger.info(`Processing email job: ${template} to ${to}`);

            await sendEmail({
                to:   Array.isArray(to) ? to.join(', ') : to ,
                template: template,
                data: data,
            });

            this.logger.info(`Email sent successfully: ${template} to ${to}`);
            return { success: true };
        } catch (error) {
            console.error('Error sending email:', error);
            this.logger.error(`Error sending email: ${template}`, error);
            throw error; // This will trigger retry
        }
    }
}