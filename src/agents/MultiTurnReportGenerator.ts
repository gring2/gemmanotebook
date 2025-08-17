import { GemmaService } from '@/ai/GemmaService';
import { ReferenceProcessor } from './ReferenceProcessor';
import { ContentWriter, ReportOutline } from './ContentWriter';
import { KeyFacts, ReportSection } from './BaseAgent';

export interface ReportProgress {
  stage: string;
  message: string;
  progress: number; // 0-100
}

export class MultiTurnReportGenerator {
  private referenceProcessor: ReferenceProcessor;
  private contentWriter: ContentWriter;

  constructor(private gemmaService: GemmaService) {
    this.referenceProcessor = new ReferenceProcessor(gemmaService);
    this.contentWriter = new ContentWriter(gemmaService);
  }

  async generateKoreanReport(
    instruction: string,
    referenceText: string,
    onProgress?: (progress: ReportProgress) => void
  ): Promise<string> {
    try {
      console.log('Starting multi-turn Korean report generation');
      console.log('Instruction:', instruction);
      console.log('Reference text length:', referenceText.length);

      // Stage 1: Process reference materials
      onProgress?.({
        stage: 'processing',
        message: '📋 참고자료에서 핵심 정보를 추출하고 있습니다...',
        progress: 10
      });

      const keyFacts = await this.referenceProcessor.processReference(referenceText);
      console.log('Extracted facts:', keyFacts.length);

      if (keyFacts.length === 0) {
        throw new Error('참고자료에서 유용한 정보를 추출할 수 없습니다.');
      }

      // Stage 2: Generate report outline
      onProgress?.({
        stage: 'planning',
        message: '📋 리포트 구조를 계획하고 있습니다...',
        progress: 30
      });

      const outline = await this.contentWriter.generateKoreanReportOutline(keyFacts, instruction);
      console.log('Generated outline:', outline);

      // Stage 3: Write each section
      const sections: ReportSection[] = [];
      const totalSections = outline.sections.length;

      for (let i = 0; i < totalSections; i++) {
        const sectionTitle = outline.sections[i];
        
        onProgress?.({
          stage: 'writing',
          message: `✍️ "${sectionTitle}" 섹션을 작성하고 있습니다... (${i + 1}/${totalSections})`,
          progress: 40 + (i / totalSections) * 50
        });

        const relevantFacts = this.contentWriter.findRelevantFacts(sectionTitle, keyFacts);
        console.log(`Section "${sectionTitle}" has ${relevantFacts.length} relevant facts`);

        const content = await this.contentWriter.writeSection(sectionTitle, relevantFacts);
        
        sections.push({
          title: sectionTitle,
          content: content,
          facts: relevantFacts
        });
      }

      // Stage 4: Combine into final report
      onProgress?.({
        stage: 'finalizing',
        message: '📄 리포트를 완성하고 있습니다...',
        progress: 90
      });

      const finalReport = this.combineIntoFinalReport(outline.title, sections);

      onProgress?.({
        stage: 'complete',
        message: '✅ 리포트 작성이 완료되었습니다!',
        progress: 100
      });

      console.log('Final report length:', finalReport.length);
      return finalReport;

    } catch (error) {
      console.error('Multi-turn report generation failed:', error);
      onProgress?.({
        stage: 'error',
        message: `❌ 리포트 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
        progress: 0
      });
      throw error;
    }
  }

  shouldUseMultiTurn(instruction: string, referenceText: string): boolean {
    const isKorean = this.containsKorean(instruction);
    const isReportRequest = instruction.includes('리포트') || 
                           instruction.includes('보고서') || 
                           instruction.includes('초안') ||
                           instruction.includes('작성');
    const hasLargeReference = referenceText.length > 800;
    const hasReference = referenceText.trim().length > 0;

    const shouldUse = isKorean && isReportRequest && hasLargeReference && hasReference;
    
    console.log('Multi-turn decision:', {
      isKorean,
      isReportRequest, 
      hasLargeReference,
      hasReference,
      shouldUse
    });

    return shouldUse;
  }

  private combineIntoFinalReport(title: string, sections: ReportSection[]): string {
    const reportParts = [`# ${title}\n\n`];

    sections.forEach(section => {
      reportParts.push(`## ${section.title}\n\n${section.content}\n\n`);
    });

    // Add metadata footer
    const factCount = sections.reduce((sum, section) => sum + section.facts.length, 0);
    reportParts.push(`---\n*이 리포트는 참고자료를 바탕으로 ${sections.length}개 섹션, ${factCount}개 주요 사실을 활용하여 작성되었습니다.*`);

    return reportParts.join('');
  }

  private containsKorean(text: string): boolean {
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/;
    return koreanRegex.test(text);
  }

  // Debug method to test individual components
  async testComponents(referenceText: string): Promise<any> {
    console.log('=== Testing Multi-Turn Components ===');
    
    try {
      // Test reference processing
      console.log('1. Testing Reference Processing...');
      const facts = await this.referenceProcessor.processReference(referenceText);
      console.log('Extracted facts:', facts);

      if (facts.length === 0) {
        console.log('No facts extracted - this will cause issues');
        return { facts: [], outline: null, error: 'No facts extracted' };
      }

      // Test outline generation
      console.log('2. Testing Outline Generation...');
      const outline = await this.contentWriter.generateKoreanReportOutline(
        facts, 
        '리포트 초안을 작성해줘'
      );
      console.log('Generated outline:', outline);

      // Test section writing
      console.log('3. Testing Section Writing...');
      if (outline.sections.length > 0) {
        const sectionTitle = outline.sections[0];
        const relevantFacts = this.contentWriter.findRelevantFacts(sectionTitle, facts);
        const sectionContent = await this.contentWriter.writeSection(sectionTitle, relevantFacts);
        console.log(`Sample section "${sectionTitle}":`, sectionContent);
      }

      return {
        facts,
        outline,
        success: true
      };

    } catch (error) {
      console.error('Component testing failed:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}