// Pilots the SPICE AI Chatbot can answer about, with the questions suggested for each one.
// The questions come from the pilots' knowledge bases and are kept in English, like their documents.
export interface ChatbotPilot {
  slug: 'thessaloniki' | 'bielsko-biala' | 'cuba' | 'rovaniemi';
  name: string;
  questions: string[];
}

export const CHATBOT_PILOTS: ChatbotPilot[] = [
  {
    slug: 'thessaloniki',
    name: 'Thessaloniki',
    questions: [
      'What is the current level of social housing stock in Greece?',
      'How does the Municipality plan to engage citizens in the climate neutrality transition process?',
      'How does the availability of green space in Thessaloniki compare to European standards?',
      'What is the population of the Municipality of Thessaloniki according to the 2021 census?',
    ],
  },
  {
    slug: 'bielsko-biala',
    name: 'Bielsko-Biała',
    questions: [
      'What cultural title did Bielsko-Biała receive for 2026, and what impact is this expected to have?',
      'What was the historical function of 11 Listopada Street, and how did it change after the construction of a large shopping centre?',
      'Approximately how many refugees from Ukraine arrived in the city, and what three types of challenges did this present?',
      'Which three areas were the focus of major infrastructure projects completed in Bielsko-Biała in 2024?',
    ],
  },
  {
    slug: 'cuba',
    name: 'Cuba',
    questions: [
      'What is Cante Alentejano and why is it important for Cuba’s identity?',
      'What is the total resident population of Cuba and what long-term trends can be reported?',
      'What are the main sectors of employment in the Municipality of Cuba?',
      'When was the public fountain “Chafariz da Fonte dos Leões” built?',
    ],
  },
  {
    slug: 'rovaniemi',
    name: 'Rovaniemi',
    questions: [
      'How does culture contribute to people’s well-being and everyday life in Rovaniemi?',
      'How have the residents been involved in shaping cultural policies in Rovaniemi?',
      'What responsibilities does the municipality have for promoting residents’ well-being?',
      'How does the City of Rovaniemi support businesses?',
    ],
  },
];
