// Test the multi-turn report generation system
import { MultiTurnReportGenerator } from './dist/agents/MultiTurnReportGenerator.js';
import { GemmaService } from './dist/ai/GemmaService.js';

// Mock GemmaService for testing
class MockGemmaService {
  async generate(prompt, options = {}) {
    console.log('=== MOCK AI GENERATION ===');
    console.log('Prompt length:', prompt.length);
    console.log('Prompt preview:', prompt.substring(0, 200) + '...');
    console.log('Max tokens:', options.maxTokens || 'default');
    console.log('=== END MOCK ===\n');

    // Simulate different types of responses based on prompt content
    if (prompt.includes('Extract key facts')) {
      return `FACT 1:
Subject: VIZZ eye drops
Action: FDA approved for presbyopia treatment  
Details: First aceclidine-based eye drop, available Q4 2025

FACT 2:
Subject: LENZ Therapeutics
Action: Developed VIZZ treatment
Details: Clinical trials with 30,000+ treatment days, no serious adverse events

FACT 3:
Subject: Presbyopia condition
Action: Affects vision in adults over 45
Details: Impacts 128 million adults in United States, causes near vision loss`;
    }

    if (prompt.includes('Korean report outline')) {
      return `FDA 승인 안과 점안제 개요
주요 기술적 특징
임상시험 결과
시장 전망`;
    }

    if (prompt.includes('Write a Korean paragraph')) {
      if (prompt.includes('개요')) {
        return 'LENZ사에서 개발한 VIZZ는 FDA로부터 승인받은 최초의 아세클리딘 기반 점안제입니다. 이 혁신적인 치료제는 45세 이상 성인의 노안 치료를 목적으로 개발되었으며, 2025년 4분기 상용화를 앞두고 있습니다.';
      } else if (prompt.includes('특징')) {
        return 'VIZZ는 동공을 축소시키는 핀홀 효과를 통해 근거리 시야를 개선합니다. 기존 치료제와 달리 모양체근에 큰 영향을 주지 않아 부작용을 최소화했으며, 하루 한 번 점안으로 최대 10시간 효과가 지속됩니다.';
      } else if (prompt.includes('결과')) {
        return '3개의 무작위 대조 임상시험에서 30,000회 이상의 치료 과정을 통해 안전성을 검증했습니다. 연구 결과 심각한 부작용 없이 우수한 치료 효과를 보여 FDA 승인을 받을 수 있었습니다.';
      } else {
        return '이 기술은 노안 치료의 새로운 표준이 될 것으로 예상됩니다. 미국 내 1억 2천 8백만 명의 잠재 환자들에게 혁신적인 치료 옵션을 제공할 것입니다.';
      }
    }

    return 'Mock AI response';
  }

  containsKorean(text) {
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/;
    return koreanRegex.test(text);
  }
}

// Test data - your FDA eye drops article
const testReferenceText = `FDA approves breakthrough eye drops that fix near vision without glasses
By Bronwyn Thompson
August 06, 2025

The first aceclidine-based eye drop to improve near vision in adults with presbyopia, which affects more than 100 million adults in the US alone, has been approved by the Food and Drug Administration (FDA) and will be available within three months.

Known as VIZZ, from pharmaceutical company LENZ, the drops are an aceclidine ophthalmic solution that effectively treats presbyopia in adults. The once-daily drops offer relief from blurry near. vision for up to 10 hours.

"The FDA approval of VIZZ is a defining moment for LENZ and represents a transformative improvement in the available treatment options for the 128 million adults living with blurry near vision in the United States," said Eef Schimmelpennink, President and Chief Executive Officer of LENZ Therapeutics.

VIZZ works by gently shrinking the pupil of the eye, using aceclidine. This creates a "pinhole effect" – like narrowing a camera lens — which helps bring nearby objects into sharper focus. Unlike older eye drops, this one does not significantly affect the eye's focusing muscles, so it doesn't blur your distance vision or cause that "zoomed-in" effect (aka a myopic shift).

The FDA approval comes on the back of three randomized, double-masked, controlled Phase II studies featuring hundreds of participants. VIZZ was well-tolerated with no serious adverse events observed in the 30,000-plus treatment days across all three trials.`;

async function testMultiTurnSystem() {
  console.log('🧪 Testing Multi-Turn Report Generation System\n');

  const mockGemmaService = new MockGemmaService();
  const generator = new MultiTurnReportGenerator(mockGemmaService);

  // Test 1: Check if multi-turn should be used
  const instruction = '참고자료를 활용해서 리포트의 초안을 만들어줘';
  const shouldUse = generator.shouldUseMultiTurn(instruction, testReferenceText);
  console.log('Should use multi-turn:', shouldUse);
  
  if (!shouldUse) {
    console.log('❌ Multi-turn detection failed - this should return true for Korean report requests with large reference text');
    return;
  }

  // Test 2: Test individual components
  console.log('\n📋 Testing individual components...');
  const testResults = await generator.testComponents(testReferenceText);
  console.log('Component test results:', testResults);

  if (testResults.error) {
    console.log('❌ Component testing failed:', testResults.error);
    return;
  }

  // Test 3: Full integration test
  console.log('\n🚀 Testing full multi-turn report generation...');
  try {
    const report = await generator.generateKoreanReport(
      instruction,
      testReferenceText,
      (progress) => {
        console.log(`Progress: ${progress.message} (${progress.progress}%)`);
      }
    );

    console.log('\n✅ Generated Report:');
    console.log('='.repeat(50));
    console.log(report);
    console.log('='.repeat(50));

    // Validate the report
    if (report.includes('VIZZ') && report.includes('FDA') && report.length > 200) {
      console.log('\n🎉 SUCCESS: Multi-turn system generated a Korean report using reference materials!');
      console.log(`Report length: ${report.length} characters`);
      console.log(`Contains Korean text: ${mockGemmaService.containsKorean(report)}`);
    } else {
      console.log('❌ Report validation failed - missing key information or too short');
    }

  } catch (error) {
    console.log('❌ Full integration test failed:', error.message);
  }
}

// Run the test
testMultiTurnSystem().catch(console.error);