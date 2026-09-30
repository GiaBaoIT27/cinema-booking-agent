import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  /** Content-ID: dùng để nhúng ảnh inline bằng <img src="cid:...">. */
  cid?: string;
  contentType?: string;
}

export interface MailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
}

/** Hạ tầng gửi mail dùng chung. Không chứa nghiệp vụ, không biết template nào. */
@Injectable()
export class MailerService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from = config.getOrThrow<string>('mail.from');
    const user = config.get<string>('mail.user');
    const password = config.get<string>('mail.password');

    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('mail.host'),
      port: config.getOrThrow<number>('mail.port'),
      secure: config.get<boolean>('mail.secure', false),
      auth: user && password ? { user, pass: password } : undefined,
    });
  }

  async send(payload: MailPayload): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...payload });
  }
}
