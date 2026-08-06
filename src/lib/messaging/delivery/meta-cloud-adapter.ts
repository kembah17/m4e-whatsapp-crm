import type {
  DeliveryAdapter,
  DeliveryResult,
  SendTextArgs,
  SendTemplateArgs,
  SendMediaArgs,
  SendInteractiveArgs,
} from './types'
import {
  sendTextMessage,
  sendTemplateMessage,
  sendMediaMessage,
  sendInteractiveButtons,
  sendInteractiveList,
} from '@/lib/whatsapp/meta-api'

/**
 * Meta Cloud API delivery adapter.
 * Wraps existing meta-api.ts functions behind the DeliveryAdapter interface.
 *
 * This adapter is used when the account connects directly to Meta's
 * WhatsApp Cloud API (requires Meta Business Verification).
 */
export class MetaCloudDeliveryAdapter implements DeliveryAdapter {
  readonly provider = 'meta-cloud' as const
  readonly channel = 'whatsapp' as const

  constructor(
    private phoneNumberId: string,
    private accessToken: string,
  ) {}

  async sendText(args: SendTextArgs): Promise<DeliveryResult> {
    try {
      const result = await sendTextMessage({
        phoneNumberId: this.phoneNumberId,
        accessToken: this.accessToken,
        to: args.to,
        text: args.text,
      })
      return {
        success: true,
        messageId: result.messageId,
        providerResponse: result,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async sendTemplate(args: SendTemplateArgs): Promise<DeliveryResult> {
    try {
      const result = await sendTemplateMessage({
        phoneNumberId: this.phoneNumberId,
        accessToken: this.accessToken,
        to: args.to,
        templateName: args.templateName,
        language: args.templateLanguage,
        params: args.bodyParams,
      })
      return {
        success: true,
        messageId: result.messageId,
        providerResponse: result,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async sendMedia(args: SendMediaArgs): Promise<DeliveryResult> {
    try {
      if (!args.mediaUrl) {
        return {
          success: false,
          error: 'Meta Cloud API requires a media URL (link). Media ID uploads are not supported through this adapter.',
          retryable: false,
        }
      }
      const result = await sendMediaMessage({
        phoneNumberId: this.phoneNumberId,
        accessToken: this.accessToken,
        to: args.to,
        kind: args.mediaType,
        link: args.mediaUrl,
        caption: args.caption,
        filename: args.filename,
      })
      return {
        success: true,
        messageId: result.messageId,
        providerResponse: result,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async sendInteractive(args: SendInteractiveArgs): Promise<DeliveryResult> {
    try {
      let result
      if (args.type === 'buttons' && args.buttons) {
        result = await sendInteractiveButtons({
          phoneNumberId: this.phoneNumberId,
          accessToken: this.accessToken,
          to: args.to,
          bodyText: args.body,
          buttons: args.buttons.map((b) => ({ id: b.id, title: b.title })),
          headerText: args.header?.text,
          footerText: args.footer,
        })
      } else if (args.type === 'list' && args.sections) {
        result = await sendInteractiveList({
          phoneNumberId: this.phoneNumberId,
          accessToken: this.accessToken,
          to: args.to,
          bodyText: args.body,
          buttonLabel: 'Select',
          sections: args.sections,
          headerText: args.header?.text,
          footerText: args.footer,
        })
      } else {
        return {
          success: false,
          error: 'Invalid interactive type or missing data',
          retryable: false,
        }
      }
      return {
        success: true,
        messageId: result.messageId,
        providerResponse: result,
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async isConfigured(): Promise<boolean> {
    return !!(this.phoneNumberId && this.accessToken)
  }

  private handleError(error: unknown): DeliveryResult {
    const message = error instanceof Error ? error.message : String(error)
    // Check if Meta error is retryable (rate limit, temporary failure)
    const retryable =
      message.includes('rate') ||
      message.includes('temporarily') ||
      message.includes('429')
    return {
      success: false,
      error: message,
      retryable,
    }
  }
}
