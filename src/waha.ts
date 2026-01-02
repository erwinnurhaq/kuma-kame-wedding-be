import { APP_CONFIG } from './config';
import { logger } from './logger';
import { Attendance } from './types';

function formatAttendanceMessage(data: Attendance) {
  let text = `*# Attendance Received #*\n\nName: ${data.name}\nAttendance: ${data.attendance}\nTotal Guests: ${data.totalGuests}\nMessage:`;
  text += data.message ? `\n"\n${data.message}\n"` : `-`;
  return text;
}

export async function sendAttendanceWhatsAppNotification(data: Attendance) {
  try {
    const res = await fetch(`${APP_CONFIG.WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Api-Key': APP_CONFIG.WAHA_API_KEY,
      },
      body: JSON.stringify({
        chatId: APP_CONFIG.WAHA_TARGET_ID,
        session: APP_CONFIG.WAHA_SESSION,
        text: formatAttendanceMessage(data),
      }),
    });
    const resData = await res.json();

    logger.info('WhatsApp Notification Sent', { uuid: data.uuid, name: data.name });
  } catch (err) {
    console.log(`${APP_CONFIG.WAHA_URL}/api/sendText`);
    logger.error('WhatsApp Notification Fail', err);
  }
}
