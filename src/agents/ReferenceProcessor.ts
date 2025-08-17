import { BaseAgent, KeyFacts } from './BaseAgent';
import { GemmaService } from '@/ai/GemmaService';

export class ReferenceProcessor extends BaseAgent {
  constructor(gemmaService: GemmaService) {
    super(gemmaService);
  }

  async processReference(referenceText: string): Promise<KeyFacts[]> {
    if (!referenceText || referenceText.trim().length === 0) {
      return [];
    }

    console.log('Processing reference text, length:', referenceText.length);
    
    // Break into manageable chunks for Gemma
    const chunks = this.chunkText(referenceText, 500, 100);
    console.log('Split into chunks:', chunks.length);
    
    const allFacts: KeyFacts[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length}, length:`, chunk.length);
      
      try {
        const facts = await this.extractFactsFromChunk(chunk);
        allFacts.push(...facts);
      } catch (error) {
        console.error(`Failed to process chunk ${i + 1}:`, error);
        // Continue with other chunks
      }
    }

    console.log('Total facts extracted:', allFacts.length);
    return this.deduplicateAndRankFacts(allFacts);
  }

  private async extractFactsFromChunk(chunk: string): Promise<KeyFacts[]> {
    const prompt = `Extract key facts from this text. Focus on specific information like names, numbers, dates, and actions.

Text:
${chunk}

List facts in this format:
FACT 1:
Subject: [main topic/entity]
Action: [what happened/what it does]
Details: [specific details, numbers, dates]

FACT 2:
Subject: [main topic/entity]
Action: [what happened/what it does]  
Details: [specific details, numbers, dates]

Extract 2-4 most important facts only.`;

    const response = await this.generateWithRetry(prompt, {
      maxTokens: 300,
      temperature: 0.3 // Lower temperature for factual extraction
    });

    return this.parseFactsFromResponse(response);
  }

  private parseFactsFromResponse(response: string): KeyFacts[] {
    const facts: KeyFacts[] = [];
    const factBlocks = response.split(/FACT \d+:/i).slice(1); // Remove empty first element
    
    for (const block of factBlocks) {
      try {
        const subjectMatch = block.match(/Subject:\s*(.+)/i);
        const actionMatch = block.match(/Action:\s*(.+)/i);  
        const detailsMatch = block.match(/Details:\s*(.+)/i);
        
        if (subjectMatch && actionMatch && detailsMatch) {
          facts.push({
            subject: subjectMatch[1].trim(),
            action: actionMatch[1].trim(),
            details: detailsMatch[1].trim()
          });
        }
      } catch (error) {
        console.warn('Failed to parse fact block:', block);
      }
    }

    return facts;
  }

  private deduplicateAndRankFacts(facts: KeyFacts[]): KeyFacts[] {
    // Simple deduplication by subject similarity
    const uniqueFacts: KeyFacts[] = [];
    
    for (const fact of facts) {
      const isDuplicate = uniqueFacts.some(existing => 
        this.areFactsSimilar(fact, existing)
      );
      
      if (!isDuplicate) {
        uniqueFacts.push(fact);
      }
    }

    // Sort by detail richness (more details = higher relevance)
    return uniqueFacts
      .map(fact => ({
        ...fact,
        relevanceScore: this.calculateRelevanceScore(fact)
      }))
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 10); // Keep top 10 most relevant facts
  }

  private areFactsSimilar(fact1: KeyFacts, fact2: KeyFacts): boolean {
    const similarity = this.calculateStringSimilarity(
      fact1.subject.toLowerCase(), 
      fact2.subject.toLowerCase()
    );
    return similarity > 0.7; // 70% similarity threshold
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private calculateRelevanceScore(fact: KeyFacts): number {
    let score = 0;
    
    // More detailed facts get higher scores
    score += fact.details.length * 0.1;
    
    // Facts with numbers/dates are often more important
    if (/\d/.test(fact.details)) score += 5;
    
    // Facts with proper nouns (capitalized words) are often key
    if (/[A-Z][a-z]/.test(fact.subject)) score += 3;
    
    // Longer subjects often indicate specificity
    score += fact.subject.length * 0.05;
    
    return score;
  }
}