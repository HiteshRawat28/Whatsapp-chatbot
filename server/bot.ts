import Groq from 'groq-sdk';
import type { Conversation, ConversationContext, QuickReply } from './types.js';

export interface BotResult {
  text: string;
  quickReplies?: QuickReply[];
  conversationPatch?: Partial<Conversation>;
}

const mainMenu: QuickReply[] = [
  { id: 'services', label: 'Explore services' },
  { id: 'consultation', label: 'Book consultation' },
  { id: 'pricing', label: 'Pricing & savings' },
  { id: 'human', label: 'Talk to an expert' }
];

const serviceMenu: QuickReply[] = [
  { id: 'solar', label: 'Rooftop solar' },
  { id: 'audit', label: 'Energy audit' },
  { id: 'ev', label: 'EV charging' },
  { id: 'maintenance', label: 'Maintenance' }
];

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function escapeUserText(text: string) {
  return text.replace(/[<>]/g, '').trim().slice(0, 120);
}

export class SupportBot {
  private groq: Groq;

  constructor(
    private readonly businessName: string,
    private readonly escalationPhone: string
  ) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || ''
    });
  }

  welcome(): BotResult {
    return {
      text: `Hi! I’m Ava, the ${this.businessName} virtual assistant. I can help you explore clean-energy services, understand the consultation process, or connect you with a specialist.`,
      quickReplies: mainMenu
    };
  }

  async respond(conversation: Conversation, rawText: string): Promise<BotResult | null> {
    if (conversation.status === 'human_active') return null;

    // Define strict guardrails and persona
    const systemPrompt = `You are Ava, a professional, concise, and helpful virtual assistant for ${this.businessName}, a clean-energy company. 
You help customers with rooftop solar, energy audits, EV charging, and system maintenance.
Rules:
1. ALWAYS keep responses extremely short, under 2 sentences. You are chatting on WhatsApp.
2. If the user asks about anything unrelated to energy services (e.g. politics, coding, general trivia), politely refuse and bring the topic back to energy.
3. If the user asks to speak to a human, seems frustrated, or has complex technical issues, you MUST call the 'request_human_agent' tool. Do NOT just say you are connecting them in text.
4. If a user asks for contact info, our phone number is +91 ${this.escalationPhone.slice(-10, -5)} ${this.escalationPhone.slice(-5)}.
5. DEAL NEGOTIATION: If the customer asks for a deal, pricing, or an estimate, you can calculate and offer a simulated "preliminary deal" to keep them engaged. Assume a base price of roughly ₹60,000 per kW for rooftop solar and ₹40,000 for an EV charger. You can offer up to a 10% discount if they book a consultation today. Always clarify that this is a preliminary estimate and a specialist will provide the final quote.`;

    // Map conversation history to LLM format
    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    for (const msg of conversation.messages) {
      if (msg.sender === 'customer') {
        messages.push({ role: 'user', content: msg.text });
      } else if (msg.sender === 'bot') {
        messages.push({ role: 'assistant', content: msg.text });
      } else if (msg.sender === 'system') {
        messages.push({ role: 'system', content: msg.text });
      }
    }
    
    // Add current message if not already present (app.ts already appends it, but just in case)
    if (messages[messages.length - 1]?.content !== rawText) {
      messages.push({ role: 'user', content: rawText });
    }

    try {
      const response = await this.groq.chat.completions.create({
        model: 'qwen/qwen3.8-27b', // Currently active model on Groq
        messages: messages as any,
        temperature: 0.5,
        tools: [
          {
            type: 'function',
            function: {
              name: 'request_human_agent',
              description: 'Call this tool when the user explicitly asks to speak to a human agent, gets angry, or asks a complex technical question.'
            }
          }
        ],
        tool_choice: 'auto'
      });

      const message = response.choices[0]?.message;

      // Handle Human Handoff Tool Call
      if (message?.tool_calls && message.tool_calls.length > 0) {
        for (const tool of message.tool_calls) {
          if (tool.function.name === 'request_human_agent') {
            return this.handoff('I’ve flagged this conversation for our team. A specialist will take over shortly.');
          }
        }
      }

      const content = message?.content || 'I am having trouble processing that right now, let me connect you to a human.';
      const isHandoff = content.toLowerCase().includes('flagged') || content.toLowerCase().includes('specialist will') || content.toLowerCase().includes('connect you');
      
      return {
        text: content,
        conversationPatch: { 
          fallbackCount: 0,
          ...(isHandoff ? { status: 'human_requested' } : {}) 
        }
      };

    } catch (error) {
      console.error('LLM Inference Error, falling back to Decision Tree:', error);
      return this.fallbackDecisionTree(conversation, rawText);
    }
  }

  private fallbackDecisionTree(conversation: Conversation, rawText: string): BotResult {
    const text = rawText.trim().toLowerCase();
    const context = conversation.context;

    if (includesAny(text, ['stop', 'unsubscribe', 'opt out'])) {
      return {
        text: 'You have been opted out of automated messages. We will not send further updates unless you start a new conversation.',
        conversationPatch: { status: 'resolved', context: {}, fallbackCount: 0 }
      };
    }

    if (includesAny(text, ['human', 'agent', 'person', 'representative', 'expert', 'call me'])) {
      return this.handoff('You asked to speak with a specialist.');
    }

    if (context.flow === 'consultation') {
      return this.handleConsultation(context, rawText);
    }

    if (includesAny(text, ['hello', 'hi', 'hey', 'start', 'menu', 'good morning', 'good evening'])) {
      const welcome = this.welcome();
      return {
        ...welcome,
        conversationPatch: { status: 'bot_active', fallbackCount: 0, context: {} }
      };
    }

    if (includesAny(text, ['service', 'what do you do', 'solution', 'offer'])) {
      return {
        text: 'We support homes and businesses with rooftop solar planning, energy-efficiency audits, EV charging setup, and ongoing system maintenance. Which area would you like to explore?',
        quickReplies: serviceMenu,
        conversationPatch: { fallbackCount: 0 }
      };
    }

    if (includesAny(text, ['solar', 'panel', 'rooftop'])) {
      return {
        text: 'Our rooftop solar service covers site assessment, system sizing, installation planning, subsidy guidance, and post-installation support. The right system depends on your location, roof area and monthly electricity use.',
        quickReplies: [
          { id: 'consultation', label: 'Request an assessment' },
          { id: 'pricing', label: 'How pricing works' }
        ],
        conversationPatch: { fallbackCount: 0 }
      };
    }

    if (includesAny(text, ['audit', 'electricity bill', 'energy usage', 'saving'])) {
      return {
        text: 'An energy audit identifies where power is being wasted and prioritises practical improvements. We review consumption patterns, major equipment and site conditions, then provide an action plan with estimated savings.',
        quickReplies: [
          { id: 'consultation', label: 'Book an audit' },
          { id: 'human', label: 'Ask an expert' }
        ],
        conversationPatch: { fallbackCount: 0 }
      };
    }

    if (includesAny(text, ['ev', 'charger', 'charging'])) {
      return {
        text: 'We help select and plan EV charging for homes, offices and commercial sites, including electrical-load checks and charger placement. A specialist can recommend the appropriate setup after a short assessment.',
        quickReplies: [
          { id: 'consultation', label: 'Plan my installation' },
          { id: 'human', label: 'Talk to an expert' }
        ],
        conversationPatch: { fallbackCount: 0 }
      };
    }

    if (includesAny(text, ['maintenance', 'repair', 'not working', 'fault', 'issue', 'support'])) {
      return {
        text: 'I’m sorry you’re experiencing an issue. For safety, please do not open electrical equipment yourself. I can connect you with a support specialist who can collect the installation details and arrange the next step.',
        quickReplies: [
          { id: 'human', label: 'Connect me now' },
          { id: 'menu', label: 'Back to menu' }
        ],
        conversationPatch: { fallbackCount: 0 }
      };
    }

    if (includesAny(text, ['price', 'pricing', 'cost', 'quote', 'budget'])) {
      return {
        text: 'Pricing depends on capacity, property conditions and equipment selection. We avoid generic estimates that may be misleading. A free initial consultation lets our team prepare an accurate, no-obligation recommendation.',
        quickReplies: [
          { id: 'consultation', label: 'Get a tailored quote' },
          { id: 'human', label: 'Talk to an expert' }
        ],
        conversationPatch: { fallbackCount: 0 }
      };
    }

    if (includesAny(text, ['consultation', 'appointment', 'book', 'assessment', 'quote'])) {
      return {
        text: 'Great — I’ll collect three quick details for the consultation. What name should I use?',
        conversationPatch: {
          context: { flow: 'consultation', step: 'name' },
          fallbackCount: 0
        }
      };
    }

    if (includesAny(text, ['contact', 'phone', 'number', 'email'])) {
      return {
        text: `You can reach our support team at +91 ${this.escalationPhone.slice(-10, -5)} ${this.escalationPhone.slice(-5)}. You can also choose “Talk to an expert” and we’ll flag this chat for follow-up.`,
        quickReplies: [
          { id: 'human', label: 'Talk to an expert' },
          { id: 'menu', label: 'Main menu' }
        ],
        conversationPatch: { fallbackCount: 0 }
      };
    }

    const nextFallbackCount = conversation.fallbackCount + 1;
    if (nextFallbackCount >= 2) {
      return this.handoff('I couldn’t confidently answer your question after two attempts.');
    }

    return {
      text: 'I’m not fully confident I understood that. Please choose one of the options below, or ask to speak with a specialist.',
      quickReplies: mainMenu,
      conversationPatch: { fallbackCount: nextFallbackCount }
    };
  }

  private handleConsultation(context: ConversationContext, rawText: string): BotResult {
    const answer = escapeUserText(rawText);
    if (!answer) {
      return { text: 'Please enter a short response so I can continue.' };
    }

    if (context.step === 'name') {
      return {
        text: `Thanks, ${answer}. Which city is the property located in?`,
        conversationPatch: {
          context: { ...context, leadName: answer, step: 'city' }
        }
      };
    }

    if (context.step === 'city') {
      return {
        text: 'And is this for a home, an office, or another commercial property?',
        quickReplies: [
          { id: 'Home', label: 'Home' },
          { id: 'Office', label: 'Office' },
          { id: 'Commercial property', label: 'Commercial' }
        ],
        conversationPatch: {
          context: { ...context, city: answer, step: 'property' }
        }
      };
    }

    const name = context.leadName || 'there';
    const city = context.city || 'your city';
    return {
      text: `Perfect, ${name}. Your consultation request for a ${answer.toLowerCase()} in ${city} has been recorded. A specialist will review it and follow up shortly. For urgent help, call +91 ${this.escalationPhone.slice(-10, -5)} ${this.escalationPhone.slice(-5)}.`,
      quickReplies: [
        { id: 'services', label: 'Explore services' },
        { id: 'human', label: 'Talk to an expert' }
      ],
      conversationPatch: { context: {}, fallbackCount: 0 }
    };
  }

  private handoff(reason: string): BotResult {
    return {
      text: `${reason} I’ve flagged this conversation for our team. You can also call us directly at +91 ${this.escalationPhone.slice(-10, -5)} ${this.escalationPhone.slice(-5)}.`,
      quickReplies: [{ id: 'menu', label: 'Continue with Ava' }],
      conversationPatch: {
        status: 'human_requested',
        fallbackCount: 0,
        context: {}
      }
    };
  }
}
