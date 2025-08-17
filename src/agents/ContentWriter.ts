import { BaseAgent, KeyFacts, ReportSection } from './BaseAgent';
import { GemmaService } from '@/ai/GemmaService';

export interface ReportOutline {
  title: string;
  sections: string[];
}

export class ContentWriter extends BaseAgent {
  constructor(gemmaService: GemmaService) {
    super(gemmaService);
  }

  async generateKoreanReportOutline(
    keyFacts: KeyFacts[], 
    instruction: string
  ): Promise<ReportOutline> {
    // Extract main topics from facts
    const topics = this.extractMainTopics(keyFacts);
    console.log('Extracted topics:', topics);
    
    const factsText = keyFacts.slice(0, 5) // Use top 5 facts for outline
      .map(f => `• ${f.subject}: ${f.action}`)
      .join('\n');

    const prompt = `Based on these key facts, create a Korean report outline:

Key Facts:
${factsText}

User requested: ${instruction}

Create 3-4 Korean report sections that cover the main topics. 
Respond with section titles only, one per line:

예: 
제품 개요
기술적 특징  
임상 결과
향후 전망`;

    const response = await this.generateWithRetry(prompt, {
      maxTokens: 150,
      temperature: 0.4
    });

    const sections = this.parseOutlineResponse(response);
    const title = this.generateReportTitle(keyFacts, instruction);
    
    return {
      title,
      sections
    };
  }

  async writeSection(sectionTitle: string, relevantFacts: KeyFacts[]): Promise<string> {
    if (relevantFacts.length === 0) {
      console.warn(`No relevant facts for section: ${sectionTitle}`);
      return `${sectionTitle}에 대한 정보가 부족합니다.`;
    }

    const factsText = relevantFacts
      .slice(0, 3) // Use top 3 most relevant facts
      .map(f => `${f.subject} ${f.action}. ${f.details}`)
      .join(' ');

    console.log(`Writing section "${sectionTitle}" with ${relevantFacts.length} facts`);

    const prompt = `Write a Korean paragraph for this report section.

Section title: ${sectionTitle}

Facts to use:
${factsText}

Write 2-3 sentences in formal Korean. Use ONLY the facts provided above. Do not add information not in the facts.

Important: Write in Korean language only.`;

    const content = await this.generateWithRetry(prompt, {
      maxTokens: 200,
      temperature: 0.5
    });

    return this.cleanSectionContent(content);
  }

  findRelevantFacts(sectionTitle: string, allFacts: KeyFacts[]): KeyFacts[] {
    // Simple keyword-based relevance matching
    const sectionKeywords = this.extractKeywords(sectionTitle.toLowerCase());
    
    const scoredFacts = allFacts.map(fact => {
      let relevanceScore = 0;
      const factText = (fact.subject + ' ' + fact.action + ' ' + fact.details).toLowerCase();
      
      // Score based on keyword matches
      for (const keyword of sectionKeywords) {
        if (factText.includes(keyword)) {
          relevanceScore += keyword.length; // Longer keywords get more weight
        }
      }
      
      // Boost score for facts with more details
      relevanceScore += fact.details.length * 0.01;
      
      return {
        ...fact,
        relevanceScore
      };
    });

    // Sort by relevance and return top facts
    return scoredFacts
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 4); // Max 4 facts per section
  }

  private extractMainTopics(facts: KeyFacts[]): string[] {
    const topics = new Set<string>();
    
    facts.forEach(fact => {
      // Extract meaningful words from subjects
      const words = fact.subject.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !this.isCommonWord(word));
      
      words.forEach(word => topics.add(word));
    });

    return Array.from(topics).slice(0, 6); // Top 6 topics
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy',
      'did', 'does', 'from', 'have', 'they', 'this', 'been', 'each', 'like',
      'more', 'will', 'about', 'could', 'other', 'after', 'first', 'never',
      'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall',
      'still', 'those', 'under', 'while'
    ]);
    
    return commonWords.has(word.toLowerCase());
  }

  private parseOutlineResponse(response: string): string[] {
    // Extract Korean section titles from response
    const lines = response.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.includes('예:') && !line.includes('Example'))
      .filter(line => this.containsKorean(line))
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, ''));

    // If we got good Korean titles, use them
    if (lines.length >= 2) {
      return lines.slice(0, 4); // Max 4 sections
    }

    // Fallback to generic Korean sections
    return ['개요', '주요 특징', '상세 정보'];
  }

  private generateReportTitle(keyFacts: KeyFacts[], instruction: string): string {
    // Extract main subject from the most relevant fact
    if (keyFacts.length > 0) {
      const mainSubject = keyFacts[0].subject;
      return `${mainSubject} 리포트`;
    }
    
    return '리포트 초안';
  }

  private extractKeywords(text: string): string[] {
    const korean = this.containsKorean(text);
    
    if (korean) {
      // For Korean, split by spacing and filter
      return text
        .split(/\s+/)
        .filter(word => word.length > 1)
        .slice(0, 5);
    } else {
      // For English, use existing logic
      return text
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .filter(word => !this.isCommonWord(word))
        .slice(0, 5);
    }
  }

  private cleanSectionContent(content: string): string {
    return content
      .trim()
      .replace(/^(Section:|섹션:)/i, '')
      .replace(/^(Content:|내용:)/i, '')
      .replace(/^\d+\.\s*/, '')
      .trim();
  }
}