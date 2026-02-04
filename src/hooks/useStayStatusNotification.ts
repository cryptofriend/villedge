import { supabase } from '@/integrations/supabase/client';

interface NotifyApplicantParams {
  stayId: string;
  newStatus: string;
  villageId: string;
  villageName: string;
}

/**
 * Send a Telegram notification to the applicant when their stay status changes
 */
export async function notifyApplicantOfStatusChange({
  stayId,
  newStatus,
  villageId,
  villageName,
}: NotifyApplicantParams): Promise<{ success: boolean; error?: string }> {
  try {
    // First, check if the applicant has subscribed to notifications
    const { data: subscription, error: subError } = await supabase
      .from('stay_notifications')
      .select('telegram_chat_id')
      .eq('stay_id', stayId)
      .maybeSingle();

    if (subError) {
      console.error('Error fetching notification subscription:', subError);
      return { success: false, error: subError.message };
    }

    if (!subscription?.telegram_chat_id) {
      console.log('No notification subscription found for stay:', stayId);
      return { success: true }; // Not an error, just no subscription
    }

    // Send the notification
    const { error } = await supabase.functions.invoke('notify-telegram', {
      body: {
        type: 'application_status',
        stayId,
        newStatus,
        villageId,
        villageName,
        applicantChatId: subscription.telegram_chat_id,
      },
    });

    if (error) {
      console.error('Error sending status notification:', error);
      return { success: false, error: error.message };
    }

    console.log(`Status notification sent for stay ${stayId}: ${newStatus}`);
    return { success: true };
  } catch (err: any) {
    console.error('Error in notifyApplicantOfStatusChange:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Generate a Telegram deep link for subscribing to stay notifications
 */
export function generateStayNotificationLink(stayId: string, botUsername: string): string {
  return `https://t.me/${botUsername}?start=stay_${stayId}`;
}
