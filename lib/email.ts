import nodemailer from 'nodemailer';

interface BookingEmailData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  datetime: string;
  weeklySchedule: Array<{
    date: string;
    sessionNumber: number;
  }>;
}

// Create transporter with Gmail SMTP
// You'll need to set up environment variables for email credentials
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: process.env.EMAIL_PASS, // Your Gmail app password
    },
  });
};

export async function sendBookingEmail(data: BookingEmailData) {
  try {
    const transporter = createTransporter();

    // Format the schedule for email
    const scheduleText = data.weeklySchedule.map((session) => {
      const sessionDate = new Date(session.date).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `  Session ${session.sessionNumber}: ${sessionDate}`;
    }).join('\n');

    // Create email content
    const emailContent = `
New Tutoring Course Booking Request (3 Sessions per Week)

Student Details:
- Name: ${data.name}
- Email: ${data.email}
- Phone: ${data.phone}

Complete Weekly Schedule:
${scheduleText}

Schedule Pattern: Session → Day Off → Session (Sundays excluded)

Additional Notes:
${data.notes || 'No additional notes provided'}

Please contact the student to confirm all three sessions.
    `.trim();

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'abdo.ashmawy573@gmail.com',
      subject: `New Physics Tutoring Booking Request - ${data.name}`,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>'),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send booking email');
  }
}

// Alternative: Using a simple SMTP configuration for other email providers
export const createSMTPTransporter = (config: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}) => {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};
