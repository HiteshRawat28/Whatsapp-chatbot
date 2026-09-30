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
      text: `Namaskar! Welcome to ${this.businessName}. Please select your preferred language / कृपया अपनी पसंदीदा भाषा चुनें:`,
      quickReplies: [
        { id: 'en', label: 'English' },
        { id: 'hi', label: 'हिंदी (Hindi)' }
      ],
      conversationPatch: { botState: 'LANGUAGE_SELECTION' }
    };
  }

  async respond(conversation: Conversation, rawText: string): Promise<BotResult | null> {
    if (conversation.status === 'human_active') return null;

    if (conversation.botState === 'LANGUAGE_SELECTION') {
      const text = rawText.toLowerCase();
      const isHindi = text.includes('hi') || text.includes('हिंदी') || text.includes('hindi');
      const lang = isHindi ? 'hi' : 'en';
      
      const greetingText = isHindi 
        ? `नमस्ते! मैं अवा हूँ, ${this.businessName} की वर्चुअल असिस्टेंट। क्या आप हमारे स्मार्ट सोलर + AI समाधानों के साथ अपने बिजली के बिल को कम करना चाहते हैं? मैं आज आपकी कैसे मदद कर सकती हूँ?`
        : `Hi! I’m Ava, your virtual assistant from ${this.businessName}. Want to smartly reduce your electricity bill with our Smart Solar + AI solutions? How can I help you today?`;
      
      const greetingMenu = isHindi ? [
        { id: 'services', label: 'सेवाएं देखें' },
        { id: 'consultation', label: 'परामर्श बुक करें' },
        { id: 'pricing', label: 'कीमत और बचत' },
        { id: 'human', label: 'विशेषज्ञ से बात करें' }
      ] : mainMenu;

      return {
        text: greetingText,
        quickReplies: greetingMenu,
        conversationPatch: { 
          botState: 'GREETING', 
          customerProfile: { ...conversation.customerProfile, language: lang }
        }
      };
    }

    const userLang = conversation.customerProfile?.language || 'en';
    const langInstruction = userLang === 'hi' ? 'You MUST respond ONLY in Hindi (हिंदी).' : 'You MUST respond ONLY in English.';

    // Define strict guardrails and persona
    let systemPrompt = `You are Ava, a virtual assistant for ${this.businessName}, an AI-powered smart solar solutions provider in Madhya Pradesh.
Your tone is welcoming and customer-friendly. ${langInstruction}
Key benefits to mention naturally:
- Smart Solar + AI for higher performance and savings.
- Free ₹20,000 Smart AI Monitoring Device with installations.
- 100% Finance Available.
- Real-time monitoring via our mobile app to track daily energy.
- Expert technical team for safe, professional setup.
`;
    
    if (conversation.botState === 'GREETING' || !conversation.botState) {
      systemPrompt += `Your primary goal right now is to ask the user what they want to do. 
Do they have a general query, or do they want to book a free solar consultation/get a quote?
Keep it short. Do NOT answer complex questions yet. 
If they indicate they have a query, use the 'set_intent' tool with intent='query'. 
If they indicate they want a deal/quote, use the 'set_intent' tool with intent='deal'.`;
    } else if (conversation.botState === 'COLLECTING_INFO') {
      systemPrompt += `The user wants to get a quote or make a deal. 
You MUST politely ask for their name and location (city). 
Do NOT provide pricing or make deals yourself. We NEVER make deals via chat.
Once they provide their name and location, use the 'save_customer_profile' tool to save this data so an expert can follow up.`;
    } else {
      systemPrompt += `Rules:
1. ALWAYS keep responses short and customer-friendly.
2. If the user asks to speak to a human, seems frustrated, or has complex technical issues, you MUST call the 'request_human_agent' tool.
3. If a user asks for contact info, our phone numbers are 8889991290 or 8889992094, and email is info@energinai.com.
4. DEAL NEGOTIATION / PRICING: NEVER make a deal or provide specific solar panel rates (DO NOT use any hardcoded base prices). If asked for pricing, inform them that pricing depends on capacity, highlight our offers (e.g., Free ₹20,000 monitor, Free consultation, 100% finance), and inform them an expert will provide an exact quote.`;
    }

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
          },
          {
            type: 'function',
            function: {
              name: 'set_intent',
              description: 'Call this tool when the user indicates if they have a general query or want to make a deal/get a quote.',
              parameters: {
                type: 'object',
                properties: {
                  intent: { type: 'string', enum: ['query', 'deal'] }
                },
                required: ['intent']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'save_customer_profile',
              description: 'Call this tool when the user provides their name and location for a deal.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  location: { type: 'string' }
                },
                required: ['name', 'location']
              }
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
          if (tool.function.name === 'set_intent') {
            const args = JSON.parse(tool.function.arguments || '{}');
            if (args.intent === 'deal') {
              return {
                text: 'Great! To help you with a deal, could I please get your name and location (city)?',
                conversationPatch: { botState: 'COLLECTING_INFO', customerProfile: { ...conversation.customerProfile, intent: 'deal' } }
              };
            } else {
              return {
                text: 'Sure, I can help with your query! What would you like to know about our services?',
                conversationPatch: { botState: 'READY_FOR_AGENT', customerProfile: { ...conversation.customerProfile, intent: 'query' } }
              };
            }
          }
          if (tool.function.name === 'save_customer_profile') {
            const args = JSON.parse(tool.function.arguments || '{}');
            return {
              text: `Thanks, ${args.name}! I have saved your location as ${args.location}. How can I assist you with the deal today?`,
              conversationPatch: { 
                botState: 'READY_FOR_AGENT', 
                customerProfile: { ...conversation.customerProfile, name: args.name, location: args.location } 
              }
            };
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

    if (includesAny(text, ['hello', 'hi', 'hey', 'start', 'menu', 'good morning', 'good evening', 'नमस्ते', 'नमस्कार', 'हेलो'])) {
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
        text: 'Pricing depends on capacity and property conditions. However, every installation comes with a FREE ₹20,000 Smart Energy Monitor and 100% Finance is available! Book a free solar consultation for an exact quote.',
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
        text: `You can reach our team at 8889991290 or 8889992094, or email us at info@energinai.com. You can also choose “Talk to an expert” to connect now.`,
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
