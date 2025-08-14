import { Tool } from "../types/chat";

export function useCommonTools() {
  const commonTools = (): Tool[] => [
    {
      name: "send_email",
      description: "Send an email to a recipient",
      parameters: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "The recipient's email address"
          },
          subject: {
            type: "string",
            description: "The email subject line"
          },
          text: {
            type: "string",
            description: "The email body content"
          }
        },
        required: ["email", "subject", "text"]
      },
      function: async (args: Record<string, unknown>) => {
        const { email, subject, text } = args;
        
        // Create mailto URL
        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject as string)}&body=${encodeURIComponent(text as string)}`;
        
        // Create temporary link element and click it
        const link = document.createElement('a');
        link.href = mailtoUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return `Email composer opened for ${email} with subject: "${subject}"`;
      }
    }
  ];

  return {
    commonTools
  };
}
