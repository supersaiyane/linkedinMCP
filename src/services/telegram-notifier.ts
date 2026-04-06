import axios from "axios";
import type { Logger } from "pino";

const TELEGRAM_API = "https://api.telegram.org";

export class TelegramNotifier {
  private readonly apiUrl: string;

  constructor(
    private botToken: string,
    private chatId: string,
    private logger: Logger,
  ) {
    this.apiUrl = `${TELEGRAM_API}/bot${botToken}`;
  }

  async send(message: string): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      });
      this.logger.debug("Telegram notification sent");
    } catch (err) {
      // Notifications are best-effort -- never throw
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn({ error: msg }, "Telegram notification failed");
    }
  }

  async notifyPostPublished(url: string, preview: string): Promise<void> {
    const text = preview.length > 80 ? preview.slice(0, 77) + "..." : preview;
    await this.send(
      `*LinkedIn Post Published*\n\n"${text}"\n\n[View Post](${url})`,
    );
  }

  async notifyScheduledPostPublished(url: string, preview: string): Promise<void> {
    const text = preview.length > 80 ? preview.slice(0, 77) + "..." : preview;
    await this.send(
      `*Scheduled Post Published*\n\n"${text}"\n\n[View Post](${url})`,
    );
  }

  async notifyScheduledPostFailed(id: string, error: string): Promise<void> {
    await this.send(
      `*Scheduled Post Failed*\n\nID: \`${id}\`\nError: ${error}`,
    );
  }

  async notifyArticlePublished(title: string, url: string): Promise<void> {
    await this.send(
      `*LinkedIn Article Published*\n\n${title}\n\n[View Post](${url})`,
    );
  }

  async notifyMediumPublished(title: string, url: string): Promise<void> {
    await this.send(
      `*Medium Article Published*\n\n${title}\n\n[Read Article](${url})`,
    );
  }

  async notifyAuthenticated(name: string): Promise<void> {
    await this.send(`*LinkedIn Connected*\n\nAuthenticated as ${name}`);
  }
}
